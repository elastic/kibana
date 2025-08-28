/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { InferenceEndpointAutocompleteItem } from '@kbn/esql-types';
import type {
  ESQLCommand,
  ESQLAstRerankCommand,
  ESQLMap,
  ESQLCommandOption,
  ESQLAstExpression,
  ESQLSingleAstItem,
} from '../../../types';
import type { ISuggestionItem } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';

export enum CaretPosition {
  RERANK_KEYWORD, // After RERANK: can be target field assignment or query
  RERANK_AFTER_ASSIGNMENT, // After "target_field ="

  ON_KEYWORD, // Should suggest "ON"
  ON_AFTER, // After "ON": suggest field names
  ON_AFTER_FIELD_ASSIGNMENT, // After "field =" in field list: suggest expressions/functions
  ON_AFTER_FIELD_SPACE, // Should suggest "WITH or PIPE or Expression"

  WITHIN_MAP_EXPRESSION, // After "WITH": suggest a json of params

  AFTER_COMMAND, // Command is complete, suggest pipe
}

export function getPosition(innerText: string, command: ESQLCommand): CaretPosition {
  const rerankCommand = command as ESQLAstRerankCommand;
  const trimmedText = innerText.trim();

  // If the user is still composing the ON field list, prefer that context over AST state
  // Handle both: immediately after selecting a field (no trailing space) and after a comma
  const upper = innerText.toUpperCase();
  const onIndex = upper.lastIndexOf(' ON ');

  if (onIndex !== -1) {
    const afterOn = innerText.slice(onIndex + 4);
    // If we're right after a comma (", ") stay in field list
    if (/[,\s]$/.test(afterOn) && /,\s*$/.test(afterOn)) {
      return CaretPosition.ON_AFTER;
    }
    // Extract last token after the last comma
    const lastToken = afterOn.split(',').pop()?.trim() ?? '';
    // If there's a token with no spaces or assignment and the cursor is immediately after it (no trailing space),
    // we are selecting a field -> stay in ON_FIELD_LIST. If there is a trailing space, allow WITH/=/| suggestions.
    if (lastToken && !lastToken.includes(' ') && !lastToken.includes('=') && /\S$/.test(afterOn)) {
      return CaretPosition.ON_AFTER;
    }
  }

  const hasValidQuery =
    rerankCommand.query &&
    !rerankCommand.query.incomplete &&
    (rerankCommand.query as ESQLSingleAstItem).type !== 'unknown';

  const hasValidFields =
    rerankCommand.fields?.length > 0 &&
    rerankCommand.fields.some((field) => field.name && !field.incomplete);

  // Check first for field assignment expressions before checking WITH clause
  if (isAfterFieldAssignment(trimmedText)) {
    return CaretPosition.ON_AFTER_FIELD_ASSIGNMENT;
  }

  // If we have query and fields, check for WITH clause
  if (hasValidQuery && hasValidFields) {
    const inferenceId = getWithMapEntry(rerankCommand, 'inference_id');
    const withMapComplete = hasCompleteWithMap(rerankCommand);

    if (inferenceId || withMapComplete) {
      return CaretPosition.AFTER_COMMAND;
    }

    if (trimmedText.includes('WITH')) {
      return CaretPosition.WITHIN_MAP_EXPRESSION;
    }

    return CaretPosition.ON_AFTER_FIELD_SPACE;
  }

  // If we have query but no fields, expect ON keyword
  if (hasValidQuery) {
    if (trimmedText.includes('ON')) {
      return CaretPosition.ON_AFTER;
    }

    return CaretPosition.ON_KEYWORD;
  }

  if (isAfterTargetFieldAssignment(innerText)) {
    return CaretPosition.RERANK_AFTER_ASSIGNMENT;
  }

  if (isInFieldListContext(trimmedText)) {
    // Check if we're after a field assignment in the field list
    if (isAfterFieldAssignment(trimmedText)) {
      return CaretPosition.ON_AFTER_FIELD_ASSIGNMENT;
    }

    return CaretPosition.ON_AFTER;
  }

  return CaretPosition.RERANK_KEYWORD;
}

export const onKeywordSuggestion: ISuggestionItem = {
  label: 'ON',
  text: 'ON ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.rerankOnDetailDoc', {
    defaultMessage: 'Specify fields to rerank',
  }),
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const withKeywordSuggestion: ISuggestionItem = {
  label: 'WITH',
  text: 'WITH { $0 }',
  asSnippet: true,
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.rerankWithDetailDoc', {
    defaultMessage: 'Optional inference parameters',
  }),
  sortText: '2',
  command: TRIGGER_SUGGESTION_COMMAND,
};

/**
 * Creates basic constant suggestions for RERANK query (simplified version)
 */
export function createBasicConstants(): ISuggestionItem[] {
  return [
    {
      label: '"query"',
      text: '"query" ',
      kind: 'Value',
      detail: i18n.translate('kbn-esql-ast.esql.autocomplete.stringLiteralDetailDoc', {
        defaultMessage: 'String literal',
      }),
      command: TRIGGER_SUGGESTION_COMMAND,
    },
  ];
}

/**
 * Creates field assignment operator suggestion
 */
export const createFieldAssignmentSuggestion = (): ISuggestionItem => ({
  label: '= expression',
  text: ' = ',
  kind: 'Operator',
  detail: i18n.translate('kbn-esql-ast.esql.autocomplete.rerankFieldAssignmentDoc', {
    defaultMessage: 'Optional assignment of boolean expression to field',
  }),
  sortText: 'C',
  command: TRIGGER_SUGGESTION_COMMAND,
});

/**
 * Creates WITH parameter map suggestions for RERANK command
 */
export const createInferenceEndpointToCompletionItem = (
  inferenceEndpoint: InferenceEndpointAutocompleteItem
): ISuggestionItem => ({
  detail: i18n.translate('kbn-esql-ast.esql.definitions.rerankInferenceIdDoc', {
    defaultMessage: 'Inference endpoint used for the completion',
  }),
  kind: 'Reference',
  label: inferenceEndpoint.inference_id,
  sortText: '1',
  text: inferenceEndpoint.inference_id,
});

/**
 * Checks if the cursor is positioned after a target field assignment (field =)
 */
function isAfterTargetFieldAssignment(innerText: string): boolean {
  return /\bRERANK\s+\w+\s*=\s*$/.test(innerText);
}

/**
 * Checks if we're in the field list context (after ON keyword)
 */
function isInFieldListContext(trimmedText: string): boolean {
  return /\bON\s+/.test(trimmedText) || trimmedText.endsWith(' ON');
}

/**
 * Checks if we're positioned after a field assignment in the ON field list
 * Example: "RERANK query ON field = " or "RERANK query ON field1, field2 = "
 */
function isAfterFieldAssignment(trimmedText: string): boolean {
  return /\bon\s+.*\w+\s*=\s*$/i.test(trimmedText);
}

/**
 * Helper to extract a value from the WITH clause map of a RERANK command
 */
function getWithMapEntry(
  rerankCommand: ESQLAstRerankCommand,
  key: string
): ESQLAstExpression | undefined {
  const withOption = rerankCommand.args.find(
    (arg): arg is ESQLCommandOption => 'type' in arg && arg.type === 'option' && arg.name === 'with'
  );

  if (!withOption) return undefined;

  const map = withOption.args[0] as ESQLMap | undefined;
  return map?.entries.find((entry) => entry.key.valueUnquoted === key)?.value;
}

/**
 * Returns true if a WITH map is present and not incomplete, regardless of its content.
 */
function hasCompleteWithMap(rerankCommand: ESQLAstRerankCommand): boolean {
  const withOption = rerankCommand.args.find(
    (arg): arg is ESQLCommandOption => 'type' in arg && arg.type === 'option' && arg.name === 'with'
  );

  if (!withOption) {
    return false;
  }

  const map = withOption.args[0] as ESQLMap | undefined;
  return Boolean(map && !map.incomplete);
}
