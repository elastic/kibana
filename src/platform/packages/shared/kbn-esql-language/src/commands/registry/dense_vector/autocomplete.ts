/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type {
  ESQLAstAllCommands,
  ESQLAstDenseVectorCommand,
  ESQLAstField,
} from '@elastic/esql/types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
import { Location } from '../types';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';
import {
  getPosition,
  CaretPosition,
  getFieldListExpressions,
  getTextAfterCommandKeyword,
  canSuggestSuffixModifier,
  canSuggestTargetAssignment,
  isAwaitingSuffixOn,
  DENSE_VECTOR_SUFFIX_KEYWORD,
  DENSE_VECTOR_DEFAULT_SUFFIX,
} from './utils';
import {
  onCompleteItem,
  withCompleteItem,
  withMapCompleteItem,
  buildMapValueCompleteItem,
  newLineAndPipeCompleteItems,
  newLineCompleteItem,
  pipeCompleteItem,
} from '../complete_items';
import { createInferenceEndpointToCompletionItem } from '../../definitions/utils/autocomplete/helpers';
import { suggestFieldsList } from '../../definitions/utils/autocomplete/fields_list';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';

/** Opens the multi-field form, which renames every generated column with a shared suffix. */
const SUFFIX_MODIFIER_SUGGESTION: ISuggestionItem = {
  label: `${DENSE_VECTOR_SUFFIX_KEYWORD} = "..." ON`,
  text: `${DENSE_VECTOR_SUFFIX_KEYWORD} = "$\{1:${DENSE_VECTOR_DEFAULT_SUFFIX}}" ON $0`,
  kind: 'Keyword',
  detail: i18n.translate(
    'kbn-esql-language.commands.denseVector.autocomplete.suffixModifierDetail',
    {
      defaultMessage: 'Custom suffix for the generated columns (default: _dense_vector)',
    }
  ),
  asSnippet: true,
  category: SuggestionCategory.LANGUAGE_KEYWORD,
};

/**
 * Parameters accepted by the `WITH { ... }` map. Built on demand so the descriptions are
 * translated at runtime.
 */
const getDenseVectorMapParameters = (context?: ICommandContext): MapParameters => ({
  inference_id: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.denseVector.autocomplete.inferenceIdDescription',
      {
        defaultMessage:
          'Text embedding inference endpoint used to generate the embeddings (default: the built-in endpoint)',
      }
    ),
    suggestions: context?.inferenceEndpoints?.map(createInferenceEndpointToCompletionItem) ?? [],
  },
  timeout: {
    type: 'string',
    description: i18n.translate(
      'kbn-esql-language.commands.denseVector.autocomplete.timeoutDescription',
      { defaultMessage: 'Maximum time to wait for each inference request (default: 30s)' }
    ),
    suggestions: [buildMapValueCompleteItem('30s')],
  },
});

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> {
  const denseVectorCommand = command as ESQLAstDenseVectorCommand;
  const innerText = query.substring(0, cursorPosition);

  if (!callbacks?.getByType) {
    return [];
  }

  const position = getPosition(denseVectorCommand, cursorPosition);

  /**
   * Both of the command's field lists are suggested the same way. They differ only in whether
   * the list may be continued with a comma, and whether it may be opened by a `target =`
   * assignment — the `ON` list allows neither.
   */
  const suggestFields = (
    fieldList: ESQLAstField[],
    { allowTargetAssignment = false, allowComma = true } = {}
  ) =>
    suggestFieldsList(
      query,
      command,
      fieldList,
      Location.DENSE_VECTOR,
      callbacks,
      context,
      cursorPosition,
      {
        // `includePipeAndCommaSuggestions` covers the newline and pipe as well, so when the
        // comma is dropped those two have to be re-added by hand.
        afterCompleteSuggestions: allowComma
          ? [withCompleteItem]
          : [withCompleteItem, newLineCompleteItem, pipeCompleteItem],
        includePipeAndCommaSuggestions: allowComma,
        allowSingleColumnFields: true,
        disableNewColumnSuggestion: !allowTargetAssignment,
        preferredExpressionType: ['text', 'keyword'],
      }
    );

  switch (position) {
    case CaretPosition.FIELD_LIST: {
      // A half-typed `suffix = "..."` clause is indistinguishable from an empty command in the
      // AST, so it lands here. `ON <fields>` is the only thing that can follow it.
      if (isAwaitingSuffixOn(query, denseVectorCommand, cursorPosition)) {
        return [onCompleteItem];
      }

      // The user may type a comma after a named target even though autocomplete won't offer one.
      if (
        denseVectorCommand.targetField !== undefined &&
        getTextAfterCommandKeyword(query, denseVectorCommand, cursorPosition).includes(',')
      ) {
        return [newLineCompleteItem, pipeCompleteItem];
      }

      const suggestions = await suggestFields(getFieldListExpressions(denseVectorCommand), {
        // `col0 = field` names the output column, but only as the first item of the list.
        allowTargetAssignment: canSuggestTargetAssignment(
          query,
          denseVectorCommand,
          cursorPosition
        ),
        // A named output column covers a single field, so the list cannot go on — a comma could
        // only lead to `denseVectorMultipleFieldsWithTarget`.
        allowComma: denseVectorCommand.targetField === undefined,
      });

      // The `suffix = "..." ON` modifier has to come first, so it is only offered up front.
      if (canSuggestSuffixModifier(query, denseVectorCommand, cursorPosition)) {
        suggestions.push(SUFFIX_MODIFIER_SUGGESTION);
      }

      return suggestions;
    }

    case CaretPosition.SUFFIX_ON_FIELD_LIST: {
      return suggestFields(denseVectorCommand.fields ?? []);
    }

    case CaretPosition.AFTER_WITH_KEYWORD: {
      return [withMapCompleteItem];
    }

    case CaretPosition.WITHIN_MAP_EXPRESSION: {
      return getCommandMapExpressionSuggestions(innerText, getDenseVectorMapParameters(context));
    }

    case CaretPosition.AFTER_COMMAND: {
      return newLineAndPipeCompleteItems;
    }

    default: {
      return [];
    }
  }
}
