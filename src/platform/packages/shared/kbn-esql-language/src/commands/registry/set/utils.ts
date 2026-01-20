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
import { getCommandMapExpressionSuggestions } from '../../definitions/utils/autocomplete/map_expression';
import { SignatureAnalyzer } from '../../definitions/utils/autocomplete/expressions/signature_analyzer';
import { settings } from '../../definitions/generated/settings';

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

const getUnmappedFieldsCompletionItems = (): ISuggestionItem[] => {
  return [
    {
      label: UnmappedFieldsStrategy.FAIL,
      text: `"${UnmappedFieldsStrategy.FAIL}";`,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.failDoc', {
        defaultMessage: 'Fails the query if unmapped fields are present',
      }),
    },
    {
      label: UnmappedFieldsStrategy.NULLIFY,
      text: `"${UnmappedFieldsStrategy.NULLIFY}";`,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.nullifyDoc', {
        defaultMessage: 'Treats unmapped fields as null values',
      }),
    },
    {
      label: UnmappedFieldsStrategy.LOAD,
      text: `"${UnmappedFieldsStrategy.LOAD}";`,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.loadDoc', {
        defaultMessage: 'Attempts to load the fields from the source',
      }),
    },
  ];
};

type ApproximateSetting = (typeof settings)[0] & { mapParams: string };
const getApproximateCompletionItems = (
  innerText: string,
  settingRightSide: ESQLAstItem | null
): ISuggestionItem[] => {
  if (isMap(settingRightSide)) {
    // casting the object because typescript is not able to infer the 'mapParams' property
    const approximateSetting = settings.find((s) => s.name === 'approximate') as ApproximateSetting;
    const availableParameters = SignatureAnalyzer.parseMapParams(
      approximateSetting?.mapParams || ''
    );
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
  unmapped_fields: getUnmappedFieldsCompletionItems(),
  approximate: getApproximateCompletionItems(innerText, settingRightSide),
});
