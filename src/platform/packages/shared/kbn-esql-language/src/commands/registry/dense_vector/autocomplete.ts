/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAstAllCommands, ESQLAstDenseVectorCommand } from '@elastic/esql/types';
import type { ICommandCallbacks, ISuggestionItem, ICommandContext } from '../types';
import { Location } from '../types';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';
import {
  getPosition,
  CaretPosition,
  getFieldListExpressions,
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
  text: `${DENSE_VECTOR_SUFFIX_KEYWORD} = "$\{0:${DENSE_VECTOR_DEFAULT_SUFFIX}}" ON `,
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

  switch (position) {
    case CaretPosition.FIELD_LIST: {
      // A half-typed `suffix = "..."` clause is indistinguishable from an empty command in the
      // AST, so it lands here. `ON <fields>` is the only thing that can follow it.
      if (isAwaitingSuffixOn(query, denseVectorCommand, cursorPosition)) {
        return [onCompleteItem];
      }

      // `target = field` names one output column, so the list cannot go on — offering a comma
      // would only lead to `denseVectorMultipleFieldsWithTarget`. The shared option covers the
      // newline and pipe too, so those are re-added by hand.
      const namesSingleField = denseVectorCommand.targetField !== undefined;

      const suggestions = await suggestFieldsList(
        query,
        command,
        getFieldListExpressions(denseVectorCommand),
        Location.DENSE_VECTOR,
        callbacks,
        context,
        cursorPosition,
        {
          afterCompleteSuggestions: namesSingleField
            ? [withCompleteItem, newLineCompleteItem, pipeCompleteItem]
            : [withCompleteItem],
          includePipeAndCommaSuggestions: !namesSingleField,
          allowSingleColumnFields: true,
          // `col0 = field` names the output column, but only as the first item of the list.
          disableNewColumnSuggestion: !canSuggestTargetAssignment(
            query,
            denseVectorCommand,
            cursorPosition
          ),
          preferredExpressionType: ['text', 'keyword'],
        }
      );

      // The `suffix = "..." ON` modifier has to come first, so it is only offered up front.
      if (canSuggestSuffixModifier(query, denseVectorCommand, cursorPosition)) {
        suggestions.push(SUFFIX_MODIFIER_SUGGESTION);
      }

      return suggestions;
    }

    case CaretPosition.SUFFIX_ON_FIELD_LIST: {
      return suggestFieldsList(
        query,
        command,
        denseVectorCommand.fields ?? [],
        Location.DENSE_VECTOR,
        callbacks,
        context,
        cursorPosition,
        {
          afterCompleteSuggestions: [withCompleteItem],
          allowSingleColumnFields: true,
          // The ON list accepts plain column names only.
          disableNewColumnSuggestion: true,
          preferredExpressionType: ['text', 'keyword'],
        }
      );
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
