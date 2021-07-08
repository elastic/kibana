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
} from 'kibana/server';
import { IndexPatternAttributes } from '../../../common';

type IndexPatternAttributesWithFields = Pick<IndexPatternAttributes, 'title' | 'fields'>;

export const createScriptedFieldsDeprecationsConfig: (
  core: CoreSetup
) => RegisterDeprecationsConfig = (core: CoreSetup) => ({
  getDeprecations: async (context: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
    const finder = context.savedObjectsClient.createPointInTimeFinder<IndexPatternAttributesWithFields>(
      {
        type: 'index-pattern',
        perPage: 1000,
        fields: ['title', 'fields'],
      }
    );

    const indexPatternsWithScriptedFields: IndexPatternAttributesWithFields[] = [];
    for await (const response of finder.find()) {
      indexPatternsWithScriptedFields.push(
        ...response.saved_objects.map((so) => so.attributes).filter(hasScriptedField)
      );
    }

    if (indexPatternsWithScriptedFields.length > 0) {
      const PREVIEW_LIMIT = 3;
      const indexPatternTitles = indexPatternsWithScriptedFields.map((ip) => ip.title);
      const titlesPreview = indexPatternTitles.slice(0, PREVIEW_LIMIT).join('; ');
      const allTitles = indexPatternTitles.join('; ');

      return [
        {
          message: `You have ${indexPatternsWithScriptedFields.length} index patterns (${titlesPreview}...) that use scripted fields. Scripted fields are deprecated and will be removed in future. Use runtime fields instead.`,
          documentationUrl:
            'https://www.elastic.co/guide/en/elasticsearch/reference/7.x/runtime.html', // TODO: documentation service is not available serverside https://github.com/elastic/kibana/issues/95389
          level: 'warning', // warning because it is not set in stone WHEN we remove scripted fields, hence this deprecation is not a blocker for 8.0 upgrade
          correctiveActions: {
            manualSteps: [
              'Navigate to Stack Management > Kibana > Index Patterns.',
              `Update ${indexPatternsWithScriptedFields.length} index patterns that have scripted fields to use runtime fields instead. In most cases, to migrate existing scripts, you'll need to change "return <value>;" to "emit(<value>);". Index patterns with at least one scripted field: ${allTitles}`,
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
