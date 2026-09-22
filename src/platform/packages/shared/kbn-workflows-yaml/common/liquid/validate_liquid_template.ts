/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, Scalar, visit } from 'yaml';
import { extractLiquidErrorPosition } from './extract_liquid_error_position';
import { parseTemplateString } from './liquid_parse_cache';

export interface LiquidValidationError {
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

function convertOffsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: offset - lastNewline };
}

/**
 * Maps an error position (relative to `node.value`) back to an absolute
 * offset range within the full YAML source string.
 *
 * For PLAIN and quoted scalars the mapping is a simple offset shift.
 * For block scalars (| / >) the indentation stripping makes a linear
 * offset shift incorrect, so we fall back to searching for the error
 * token directly in the node's source span.
 */
function mapToAbsolutePosition(
  yamlString: string,
  node: Scalar,
  errorMessage: string,
  relativePosition: { start: number; end: number }
): { start: number; end: number } {
  const range = node.range;
  if (!range) return relativePosition;

  switch (node.type) {
    case Scalar.BLOCK_FOLDED:
    case Scalar.BLOCK_LITERAL: {
      const nodeSource = yamlString.substring(range[0], range[2]);
      const posInSource = extractLiquidErrorPosition(nodeSource, errorMessage);
      return {
        start: range[0] + posInSource.start,
        end: range[0] + posInSource.end,
      };
    }
    case Scalar.QUOTE_DOUBLE:
    case Scalar.QUOTE_SINGLE: {
      const valueStart = range[0] + 1;
      return {
        start: valueStart + relativePosition.start,
        end: valueStart + relativePosition.end,
      };
    }
    default: {
      return {
        start: range[0] + relativePosition.start,
        end: range[0] + relativePosition.end,
      };
    }
  }
}

const LIQUID_OUTPUT_PATTERN = '{{';
const LIQUID_TAG_PATTERN = '{%';
// Matches ${{ ... }} — typed expressions (WorkflowTemplatingEngine.evaluateExpression).
// Same Liquid value grammar as runtime (evalValueSync after stripping the leading `$`).
const DYNAMIC_EXPRESSION_PATTERN = /\$\{\{(?:[^}]|\}(?!\}))*\}\}/g;
// Liquid lexical contexts where content is literal, not executed (incl. whitespace-trim tags).
const RAW_OR_COMMENT_BLOCK_PATTERN = /\{%-?\s*(raw|comment)\s*-?%\}[\s\S]*?\{%-?\s*end\1\s*-?%\}/gi;

const blankWithSameLength = (value: string, pattern: RegExp): string =>
  value.replace(pattern, (match) => ' '.repeat(match.length));

const blankRawAndCommentBlocks = (value: string): string =>
  blankWithSameLength(value, RAW_OR_COMMENT_BLOCK_PATTERN);

const blankDynamicExpressions = (value: string): string =>
  blankWithSameLength(value, DYNAMIC_EXPRESSION_PATTERN);
const pushLiquidError = (
  errors: LiquidValidationError[],
  yamlString: string,
  node: Scalar,
  liquidText: string,
  error: unknown,
  /** Offset to add onto positions extracted from liquidText (relative to node.value). */
  valueOffset = 0
): void => {
  const errorMessage = error instanceof Error ? error.message : 'Invalid Liquid syntax';
  const relativeInLiquid = extractLiquidErrorPosition(liquidText, errorMessage);
  const relativePosition = {
    start: valueOffset + relativeInLiquid.start,
    end: valueOffset + relativeInLiquid.end,
  };
  const absPosition = mapToAbsolutePosition(yamlString, node, errorMessage, relativePosition);

  const startPos = convertOffsetToLineColumn(yamlString, absPosition.start);
  const endPos = convertOffsetToLineColumn(yamlString, absPosition.end);

  errors.push({
    message: errorMessage.replace(/, line:\d+, col:\d+/g, ''),
    startLine: startPos.line,
    startColumn: startPos.column,
    endLine: endPos.line,
    endColumn: endPos.column,
  });
};

/**
 * Single well-formed `${{ ... }}` covering the entire scalar. Runtime
 * (`WorkflowTemplatingEngine.renderValueRecursively`) dispatches any string that
 * `startsWith('${{') && endsWith('}}')` as ONE typed expression via evaluateExpression
 * (first `{{` … last `}}`). A scalar like `${{ a }} {{ b }}` matches that dispatch
 * but is not a single dynamic segment — validate it as invalid rather than accepting
 * each segment independently.
 */
const WHOLE_SCALAR_TYPED_EXPRESSION = /^\$\{\{(?:[^}]|\}(?!\}))*\}\}$/;

const isRuntimeTypedExpressionDispatch = (value: string): boolean =>
  value.startsWith('${{') && value.endsWith('}}');

/**
 * Validate each `${{ ... }}` with the same Liquid grammar the runtime uses
 * (`${{ expr }}` → drop `$` → parse as `{{ expr }}`, matching evaluateExpression).
 * Catches unknown filters and invalid syntax (e.g. ternaries) that wholesale blanking
 * would hide, while still accepting operators like `!=` that Liquid supports.
 */
const validateDynamicExpressions = (
  yamlString: string,
  node: Scalar,
  value: string,
  errors: LiquidValidationError[]
): void => {
  for (const match of value.matchAll(DYNAMIC_EXPRESSION_PATTERN)) {
    const matchIndex = match.index ?? 0;
    // `${{ expr }}` → `{{ expr }}` (same as templating_engine dropping the leading `$`).
    const asLiquid = match[0].substring(1);
    try {
      parseTemplateString(asLiquid);
    } catch (error) {
      // asLiquid starts one char after `$`, so shift positions into node.value.
      pushLiquidError(errors, yamlString, node, asLiquid, error, matchIndex + 1);
    }
  }
};

/**
 * Scalars that runtime sends to evaluateExpression wholesale. Must be exactly one
 * `${{ ... }}`; otherwise report an error (mixed `${{ a }} {{ b }}` false-negative fix).
 */
const validateRuntimeTypedExpressionScalar = (
  yamlString: string,
  node: Scalar,
  value: string,
  errors: LiquidValidationError[]
): void => {
  if (!WHOLE_SCALAR_TYPED_EXPRESSION.test(value)) {
    // Synthesize a Liquid-like error so pushLiquidError can map the full scalar span.
    pushLiquidError(
      errors,
      yamlString,
      node,
      value,
      new Error(
        'Invalid typed expression: values that start with "${{" and end with "}}" are evaluated as a single expression (first "{{" through last "}}"). Use one ${{ ... }} or a plain Liquid string template.'
      )
    );
    return;
  }
  validateDynamicExpressions(yamlString, node, value, errors);
};

export function validateLiquidTemplate(
  yamlString: string,
  yamlDocument: Document
): LiquidValidationError[] {
  const errors: LiquidValidationError[] = [];

  visit(yamlDocument, {
    Scalar(key, node) {
      if (key === 'key') return;
      if (!node.range) return;
      if (typeof node.value !== 'string') return;

      // Blank {% raw %} / {% comment %} first so embedded ${{ }} / {{ }} inside them are
      // treated as literal (same as Liquid render), then validate the remainder.
      const valueOutsideLiteralBlocks = blankRawAndCommentBlocks(node.value);

      // Runtime typed-expression dispatch: whole scalar → evaluateExpression.
      // Only applies when the unmasked scalar is a typed expression (raw/comment wrappers
      // mean the value is a string template, not evaluateExpression dispatch).
      if (isRuntimeTypedExpressionDispatch(node.value)) {
        validateRuntimeTypedExpressionScalar(yamlString, node, node.value, errors);
        return;
      }

      // Embedded `${{ }}` inside a string template (does not start with `${{`).
      validateDynamicExpressions(yamlString, node, valueOutsideLiteralBlocks, errors);

      // Blank ${{ ... }} before validating remaining Liquid — avoids double-reporting the
      // same expression, and keeps mixed-value offsets aligned with the original scalar.
      const liquidValue = blankDynamicExpressions(valueOutsideLiteralBlocks);

      if (!liquidValue.includes(LIQUID_OUTPUT_PATTERN) && !liquidValue.includes(LIQUID_TAG_PATTERN))
        return;

      try {
        parseTemplateString(liquidValue);
      } catch (error) {
        pushLiquidError(errors, yamlString, node, liquidValue, error);
      }
    },
  });

  return errors;
}
