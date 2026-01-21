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
    },
    {
      label: '_alias: *',
      text: '_alias: *',
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
      text: UnmappedFieldsStrategy.FAIL,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.failDoc', {
        defaultMessage: 'Fails the query if unmapped fields are present',
      }),
    },
    {
      label: UnmappedFieldsStrategy.NULLIFY,
      text: UnmappedFieldsStrategy.NULLIFY,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.nullifyDoc', {
        defaultMessage: 'Treats unmapped fields as null values',
      }),
    },
    {
      label: UnmappedFieldsStrategy.LOAD,
      text: UnmappedFieldsStrategy.LOAD,
      kind: 'Value',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.set.unmappedFields.loadDoc', {
        defaultMessage: 'Attempts to load the fields from the source',
      }),
    },
  ];
};

export const COMPLETIONS_BY_SETTING_NAME: Record<string, ISuggestionItem[]> = {
  project_routing: getProjectRoutingCommonCompletionItems(),
  unmapped_fields: getUnmappedFieldsCompletionItems(),
};
