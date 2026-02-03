/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { UnmappedFieldsStrategy, type ISuggestionItem } from '../types';
import type { ESQLAstItem } from '../../../types';
import { isMap, SuggestionCategory } from '../../../..';
import type { MapParameters } from '../../definitions/utils/autocomplete/map_expression';
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';
import { settings } from '../../definitions/generated/settings';
import { confidenceLevelValueItems, numOfRowsValueItems } from '../complete_items';
import { parseMapParams } from '../../definitions/utils/maps';
import { Settings } from '../../definitions/keywords';

const getProjectRoutingCommonCompletionItems = (): ISuggestionItem[] => {
  return [
    {
      label: '_alias:_origin',
      text: '_alias:_origin',
      kind: 'Value',
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.projectRouting.currentProjectDoc',
        {
          defaultMessage: 'Search only the current project',
        }
      ),
      sortText: '1',
      category: SuggestionCategory.CONSTANT_VALUE,
    },
    {
      label: '_alias:*',
      text: '_alias:*',
      kind: 'Value',
      detail: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.projectRouting.allProjectsDoc',
        {
          defaultMessage: 'Search all projects',
        }
      ),
      sortText: '1',
      category: SuggestionCategory.CONSTANT_VALUE,
    },
  ];
};

const getUnmappedFieldsCompletionItems = (): ISuggestionItem[] => {
  return [
    {
      label: UnmappedFieldsStrategy.FAIL,
      text: UnmappedFieldsStrategy.FAIL,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.failDoc', {
        defaultMessage: 'Fails the query if unmapped fields are present',
      }),
      category: SuggestionCategory.CONSTANT_VALUE,
    },
    {
      label: UnmappedFieldsStrategy.NULLIFY,
      text: UnmappedFieldsStrategy.NULLIFY,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.nullifyDoc', {
        defaultMessage: 'Treats unmapped fields as null values',
      }),
      category: SuggestionCategory.CONSTANT_VALUE,
    },
    // Hiding LOAD option as it's partially supported at the moment.
    // {
    //   label: UnmappedFieldsStrategy.LOAD,
    //   text: UnmappedFieldsStrategy.LOAD,
    //   kind: 'Value',
    //   detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.loadDoc', {
    //     defaultMessage: 'Attempts to load the fields from the source',
    //   }),
    //  category: SuggestionCategory.CONSTANT_VALUE,
    // },
  ];
};

type ApproximateSetting = (typeof settings)[0] & { mapParams: string };
const getApproximateCompletionItems = (
  innerText: string,
  settingRightSide: ESQLAstItem | null
): ISuggestionItem[] => {
  if (isMap(settingRightSide)) {
    const approximateSetting = settings.find(
      (s) => s.name === Settings.APPROXIMATION
    ) as ApproximateSetting;
    const parsedParameters = parseMapParams(approximateSetting?.mapParams || '');
    const availableParameters: MapParameters = { ...parsedParameters };
    availableParameters.confidence_level.suggestions = confidenceLevelValueItems;
    availableParameters.num_rows.suggestions = numOfRowsValueItems;
    return getCommandMapExpressionSuggestions(innerText, availableParameters);
  }

  return [
    {
      label: 'false',
      text: 'false',
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
      text: 'true',
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
      label: i18n.translate(
        'kbn-esql-language.esql.autocomplete.set.approximate.approximateWithParameters',
        {
          defaultMessage: 'Approximate with parameters',
        }
      ),
      text: '{ $0 }',
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

const COMPLETIONS_BY_SETTING_NAME: Record<string, Function> = {
  [Settings.PROJECT_ROUTING]: getProjectRoutingCommonCompletionItems,
  [Settings.UNMAPPED_FIELDS]: getUnmappedFieldsCompletionItems,
  [Settings.APPROXIMATION]: getApproximateCompletionItems,
};

export const getCompletionItemsBySettingName: (
  settingName: string,
  innerText: string,
  settingRightSide: ESQLAstItem | null
) => ISuggestionItem[] = (settingName, innerText, settingRightSide) =>
  COMPLETIONS_BY_SETTING_NAME[settingName]
    ? COMPLETIONS_BY_SETTING_NAME[settingName](innerText, settingRightSide)
    : [];
