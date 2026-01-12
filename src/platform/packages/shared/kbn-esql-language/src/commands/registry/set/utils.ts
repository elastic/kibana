/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ISuggestionItem } from '../types';
import type { ESQLAstItem } from '../../../types';
import { isMap, SuggestionCategory } from '../../../..';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';

const getProjectRoutingCommonCompletionItems = (): ISuggestionItem[] => {
  return [
    {
      label: '_alias:_origin',
      text: '"_alias:_origin";',
      kind: 'Value',
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.projectRouting.currentProjectDoc',
        {
          defaultMessage: 'Search only the current project',
        }
      ),
      sortText: '1',
    },
    {
      label: '_alias: *',
      text: '"_alias: *";',
      kind: 'Value',
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.projectRouting.allProjectsDoc',
        {
          defaultMessage: 'Search all projects',
        }
      ),
      sortText: '1',
    },
  ];
};

const getApproximateCompletionItems = (
  innerText: string,
  settingRightSide: ESQLAstItem | null
): ISuggestionItem[] => {
  if (isMap(settingRightSide)) {
    const availableParameters: MapParameters = {
      num_rows: {
        type: 'number',
      },
      confidence_level: {
        type: 'number',
      },
    };
    return getCommandMapExpressionSuggestions(innerText, availableParameters);
  }
  return [
    {
      label: 'false',
      text: 'false;',
      kind: 'Value',
      category: SuggestionCategory.VALUE,
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.approximate.disallowApproximateResults',
        {
          defaultMessage: 'Default - do not approximate results',
        }
      ),
    },
    {
      label: 'true',
      text: 'true;',
      kind: 'Value',
      category: SuggestionCategory.VALUE,
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.approximate.allowApproximateResults',
        {
          defaultMessage: 'Allow approximate results',
        }
      ),
    },
    {
      label: 'Approximate with parameters',
      text: '{ $0 };',
      asSnippet: true,
      kind: 'Reference',
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.approximate.approximateWithParameters',
        {
          defaultMessage: 'Approximate results based on parameters',
        }
      ),
    },
  ];
};

export const getCompletionItemsBySettingName: (
  innerText: string,
  settingRightSide: ESQLAstItem | null
) => Record<string, ISuggestionItem[]> = (innerText, settingRightSide) => ({
  project_routing: getProjectRoutingCommonCompletionItems(),
  approximate: getApproximateCompletionItems(innerText, settingRightSide),
});
