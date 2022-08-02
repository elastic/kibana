/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
            defaultMessage: `You have {numberOfIndexPatternsWithScriptedFields} data views ({titlesPreview}...) that use scripted fields. Scripted fields are deprecated and will be removed in future. Use runtime fields instead.`,
            values: {
              titlesPreview: indexPatternTitles.slice(0, PREVIEW_LIMIT).join('; '),
              numberOfIndexPatternsWithScriptedFields: indexPatternsWithScriptedFields.length,
            },
          }),
          documentationUrl:
            'https://www.elastic.co/guide/en/elasticsearch/reference/7.x/runtime.html', // TODO: documentation service is not available serverside https://github.com/elastic/kibana/issues/95389
          level: 'warning', // warning because it is not set in stone WHEN we remove scripted fields, hence this deprecation is not a blocker for 8.0 upgrade
          correctiveActions: {
            manualSteps: [
              i18n.translate('dataViews.deprecations.scriptedFields.manualStepOneMessage', {
                defaultMessage: 'Navigate to Stack Management > Kibana > Data Views.',
              }),
              i18n.translate('dataViews.deprecations.scriptedFields.manualStepTwoMessage', {
                defaultMessage:
                  'Update {numberOfIndexPatternsWithScriptedFields} data views that have scripted fields to use runtime fields instead. In most cases, to migrate existing scripts, you will need to change "return <value>;" to "emit(<value>);". Data views with at least one scripted field: {allTitles}',
                values: {
                  allTitles: indexPatternTitles.join('; '),
                  numberOfIndexPatternsWithScriptedFields: indexPatternsWithScriptedFields.length,
                },
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
