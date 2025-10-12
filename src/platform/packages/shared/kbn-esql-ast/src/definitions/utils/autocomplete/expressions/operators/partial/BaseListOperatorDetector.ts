/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLFunction,
  ESQLList,
  ESQLSingleAstItem,
  ESQLUnknownItem,
} from '../../../../../../types';
import type { ISuggestionItem } from '../../../../../../commands_registry/types';
import type { ExpressionContext } from '../../types';
import { Builder } from '../../../../../../builder';
import { BaseOperatorDetector } from './BaseOperatorDetector';
import type { PartialOperatorDetection } from './types';
import { dispatchOperators } from '../dispatcher';

// Regex to extract field name before operator with opening parenthesis: match[1] = fieldName
const FIELD_BEFORE_OPERATOR_WITH_PAREN_REGEX = (operatorPattern: string) =>
  new RegExp(`(\\w+)\\s+${operatorPattern}\\s*\\(`, 'i');

/**
 * Base class for operators that support list syntax (IN, LIKE, etc.).
 * Handles common logic for detecting lists, extracting field names, and creating synthetic nodes.
 */
export abstract class BaseListOperatorDetector extends BaseOperatorDetector {
  // Return operator-specific pattern for detection (e.g., "IN", "LIKE")
  protected abstract getOperatorPattern(): RegExp;

  // Return the operator name from matched text
  protected abstract getOperatorName(text: string): string;

  // Detect if operator with optional list is present
  public detect(innerText: string): PartialOperatorDetection | null {
    const trimmed = innerText.trimEnd();

    // Only detect when:
    // 1. Just typed operator: "field IN "
    // 2. Just opened list: "field IN ("
    // Do NOT detect when inside list after items: "field IN (value "
    if (this.endsWithListStart(trimmed) || this.endsWithOperatorToken(trimmed)) {
      const operatorName = this.getOperatorName(trimmed);

      return this.buildDetection(innerText, operatorName);
    }

    return null;
  }

  // Check if cursor is inside an open list
  protected isInsideList(text: string): boolean {
    const pattern = this.getOperatorPattern();
    const operatorMatch = text.match(new RegExp(`${pattern.source}\\s*\\(`, 'gi'));

    if (!operatorMatch) {
      return false;
    }

    const lastOpIndex = text.lastIndexOf(operatorMatch[operatorMatch.length - 1]);
    const textAfterOp = text.substring(lastOpIndex);

    let openParens = 0;
    for (const char of textAfterOp) {
      if (char === '(') {
        openParens++;
      }

      if (char === ')') {
        openParens--;
      }
    }

    return openParens > 0;
  }

  // Check if ends with operator followed by opening parenthesis
  protected endsWithListStart(text: string): boolean {
    const pattern = this.getOperatorPattern();

    return new RegExp(`${pattern.source}\\s*\\(\\s*$`, 'i').test(text);
  }

  // Check if ends with operator token without parenthesis
  protected endsWithOperatorToken(text: string): boolean {
    const pattern = this.getOperatorPattern();

    return new RegExp(`${pattern.source}\\s*$`, 'i').test(text);
  }

  // Build detection result
  private buildDetection(innerText: string, operatorName: string): PartialOperatorDetection {
    const syntheticNode = this.createSyntheticBinaryExpression(innerText, operatorName);

    return {
      operatorName,
      syntheticNode,
      contextOverrides: {
        expressionRoot: syntheticNode,
      },
    };
  }

  // Create synthetic binary expression with list support
  protected createSyntheticBinaryExpression(innerText: string, operatorName: string): ESQLFunction {
    const textLength = innerText.length;
    const left = this.extractLeftOperand(innerText);
    const right = this.createRightOperand(innerText, textLength);

    return {
      type: 'function',
      name: operatorName,
      subtype: 'binary-expression',
      args: [
        left ?? {
          type: 'unknown',
          name: '',
          text: '',
          location: { min: 0, max: 0 },
          incomplete: true,
        },
        right,
      ],
      incomplete: true,
      location: { min: textLength, max: textLength },
      text: operatorName,
    };
  }

  // Extract left operand (field name) from text
  protected extractLeftOperand(innerText: string): ESQLSingleAstItem | undefined {
    const pattern = this.getOperatorPattern();
    const match = innerText.match(FIELD_BEFORE_OPERATOR_WITH_PAREN_REGEX(pattern.source));

    if (match?.[1]) {
      return Builder.expression.column(match[1]);
    }

    return undefined;
  }

  // Create right operand (list or placeholder)
  protected createRightOperand(innerText: string, textLength: number): ESQLSingleAstItem {
    const pattern = this.getOperatorPattern();
    const hasOpenParen = new RegExp(`${pattern.source}\\s*\\(`, 'i').test(innerText);

    if (hasOpenParen) {
      return this.createEmptyListNode(textLength);
    }

    return this.createPlaceholderNode(textLength);
  }

  // Create an empty list node using Builder
  protected createEmptyListNode(textLength: number): ESQLList {
    return Builder.expression.list.tuple(
      { text: '()', location: { min: textLength, max: textLength }, incomplete: true },
      { location: { min: textLength, max: textLength }, text: '()', incomplete: true }
    );
  }

  // Create a placeholder node for unknown type
  protected createPlaceholderNode(textLength: number): ESQLUnknownItem {
    return {
      type: 'unknown',
      name: '',
      text: '',
      location: { min: textLength, max: textLength },
      incomplete: true,
    };
  }

  // Not used - implemented by base class
  protected getPattern(): RegExp {
    return this.getOperatorPattern();
  }

  // Not used - implemented by createSyntheticBinaryExpression
  protected buildSyntheticNode(fieldName: string, operatorName: string): ESQLSingleAstItem {
    return this.createSyntheticBinaryExpression(fieldName, operatorName);
  }

  // Get suggestions by dispatching to operator handlers
  public async getSuggestions(
    { contextOverrides, optionsOverrides }: PartialOperatorDetection,
    context: ExpressionContext
  ): Promise<ISuggestionItem[] | null> {
    const mergedContext = {
      ...context,
      ...contextOverrides,
      options: {
        ...context.options,
        ...optionsOverrides,
      },
    };

    const suggestions = await dispatchOperators(mergedContext);

    return suggestions ?? [];
  }
}
