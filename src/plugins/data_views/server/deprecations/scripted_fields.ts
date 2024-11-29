/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CoreSetup,
  DeprecationsDetails,
  GetDeprecationsContext,
  RegisterDeprecationsConfig,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { DataViewAttributes } from '../../common';

type IndexPatternAttributesWithFields = Pick<DataViewAttributes, 'title' | 'fields'>;

export const createScriptedFieldsDeprecationsConfig: (
  core: CoreSetup
) => RegisterDeprecationsConfig = (core: CoreSetup) => ({
  getDeprecations: async (context: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
    const finder =
      context.savedObjectsClient.createPointInTimeFinder<IndexPatternAttributesWithFields>({
        type: 'index-pattern',
        perPage: 1000,
        fields: ['title', 'fields'],
      });

    const indexPatternsWithScriptedFields: IndexPatternAttributesWithFields[] = [];
    for await (const response of finder.find()) {
      indexPatternsWithScriptedFields.push(
        ...response.saved_objects.map((so) => so.attributes).filter(hasScriptedField)
      );
    }

    if (indexPatternsWithScriptedFields.length > 0) {
      const PREVIEW_LIMIT = 3;
      const indexPatternTitles = indexPatternsWithScriptedFields.map((ip) => ip.title);

      return [
        {
          title: i18n.translate('dataViews.deprecations.scriptedFieldsTitle', {
            defaultMessage: 'Found data views using scripted fields',
          }),
          message: i18n.translate('dataViews.deprecations.scriptedFieldsMessage', {
            defaultMessage: `You have {numberOfIndexPatternsWithScriptedFields} {numberOfIndexPatternsWithScriptedFields, plural, one {data view} other {data views}} ({titlesPreview}{ellipsis}) containing scripted fields. Scripted fields are deprecated and will be removed in the future. The ability to create new scripted fields in the Data Views management page has been disabled in 9.0, and it is recommended to migrate to runtime fields or the Elasticsearch Query Language (ES|QL) instead.`,
            values: {
              titlesPreview: indexPatternTitles.slice(0, PREVIEW_LIMIT).join('; '),
              numberOfIndexPatternsWithScriptedFields: indexPatternsWithScriptedFields.length,
              ellipsis: indexPatternTitles.length > PREVIEW_LIMIT ? '...' : '',
            },
          }),
          documentationUrl: core.docLinks.links.runtimeFields.overview,
          deprecationType: 'feature',
          level: 'warning', // warning because it is not set in stone WHEN we remove scripted fields, hence this deprecation is not a blocker for 9.0 upgrade
          correctiveActions: {
            manualSteps: [
              i18n.translate('dataViews.deprecations.scriptedFields.manualStepOneMessage', {
                defaultMessage: 'Navigate to Stack Management > Kibana > Data Views.',
              }),
              i18n.translate('dataViews.deprecations.scriptedFields.manualStepTwoMessage', {
                defaultMessage:
                  'Update data views that have scripted fields to use runtime fields instead. In most cases, to migrate existing scripts, you will need to change "return <value>;" to "emit(<value>);". Data views with at least one scripted field: {allTitles}.',
                values: { allTitles: indexPatternTitles.join('; ') },
                ignoreTag: true,
              }),
              i18n.translate('dataViews.deprecations.scriptedFields.manualStepThreeMessage', {
                defaultMessage:
                  'Alternatively, you can achieve similar functionality by computing values at query time using the Elasticsearch Query Language (ES|QL).',
              }),
            ],
          },
        },
      ];
    } else {
      return [];
    }
  },
});

export function hasScriptedField(indexPattern: IndexPatternAttributesWithFields) {
  if (indexPattern.fields) {
    try {
      return JSON.parse(indexPattern.fields).some(
        (field: { scripted?: boolean }) => field?.scripted
      );
    } catch (e) {
      return false;
    }
  } else {
    return false;
  }
}
