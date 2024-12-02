/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  DeprecationsDetails,
  GetDeprecationsContext,
  RegisterDeprecationsConfig,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { DocLinks } from '@kbn/doc-links';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
import type { DataViewAttributes } from '../../common';

type DataViewAttributesWithFields = Pick<DataViewAttributes, 'title' | 'fields'>;

export const createScriptedFieldsDeprecationsConfig: (
  core: CoreSetup
) => RegisterDeprecationsConfig = (core: CoreSetup) => ({
  getDeprecations: async (context: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
    const finder = context.savedObjectsClient.createPointInTimeFinder<DataViewAttributesWithFields>(
      {
        type: 'index-pattern',
        perPage: 1000,
        fields: ['title', 'fields'],
        namespaces: ['*'],
      }
    );

    const dataViewsWithScriptedFields: Array<SavedObjectsFindResult<DataViewAttributesWithFields>> =
      [];

    for await (const response of finder.find()) {
      dataViewsWithScriptedFields.push(
        ...response.saved_objects.filter((so) => hasScriptedField(so.attributes))
      );
    }

    if (!dataViewsWithScriptedFields.length) {
      return [];
    }

    const dataViewTitles = dataViewsWithScriptedFields.map((so) => so.attributes.title);

    return [
      {
        title: i18n.translate('dataViews.deprecations.scriptedFieldsTitle', {
          defaultMessage: 'Found data views using scripted fields',
        }),
        message: buildMessage({
          dataViewsWithScriptedFields,
          docLinks: core.docLinks.links,
        }),
        documentationUrl: core.docLinks.links.dataViews.manage,
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
              values: { allTitles: dataViewTitles.join('; ') },
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
  },
});

export function hasScriptedField(dataView: DataViewAttributesWithFields) {
  if (dataView.fields) {
    try {
      return JSON.parse(dataView.fields).some((field: { scripted?: boolean }) => field?.scripted);
    } catch (e) {
      return false;
    }
  } else {
    return false;
  }
}

const buildMessage = ({
  dataViewsWithScriptedFields,
  docLinks,
}: {
  dataViewsWithScriptedFields: Array<SavedObjectsFindResult<DataViewAttributesWithFields>>;
  docLinks: DocLinks;
}): DeprecationDetailsMessage => ({
  type: 'markdown',
  content: i18n.translate('dataViews.deprecations.scriptedFieldsMessage', {
    defaultMessage: `You have {numberOfDataViewsWithScriptedFields} {numberOfDataViewsWithScriptedFields, plural, one {data view} other {data views}} containing scripted fields. Scripted fields are deprecated and will be removed in the future.

The ability to create new scripted fields in the Data Views management page has been disabled in 9.0, and it is recommended to migrate to [runtime fields]({runtimeFieldsLink}) or the [Elasticsearch Query Language (ES|QL)]({esqlLink}) instead.

The following is a list of all data views with scripted fields and their associated spaces:
{dataViewsList}`,
    values: {
      numberOfDataViewsWithScriptedFields: dataViewsWithScriptedFields.length,
      runtimeFieldsLink: docLinks.runtimeFields.overview,
      esqlLink: docLinks.query.queryESQL,
      dataViewsList: dataViewsWithScriptedFields
        .map(
          (so) => `- **ID:** ${so.id}
  - **Title:** ${so.attributes.title}
  - **Spaces:** ${so.namespaces?.join(', ')}`
        )
        .join('\n'),
    },
  }),
});
