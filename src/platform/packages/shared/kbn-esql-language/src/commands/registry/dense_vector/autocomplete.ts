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
import { getPosition, CaretPosition } from './utils';
import {
  withCompleteItem,
  withMapCompleteItem,
  buildMapValueCompleteItem,
  newLineAndPipeCompleteItems,
} from '../complete_items';
import { createInferenceEndpointToCompletionItem } from '../../definitions/utils/autocomplete/helpers';
import { suggestFieldsList } from '../../definitions/utils/autocomplete/fields_list';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';

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
          // The grammar accepts plain column names only — no `col0 = ...` assignments.
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
