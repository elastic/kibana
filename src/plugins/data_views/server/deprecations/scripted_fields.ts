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
    defaultMessage: `### Summary

You have {numberOfDataViewsWithScriptedFields} {numberOfDataViewsWithScriptedFields, plural, one {data view} other {data views}} containing scripted fields. Scripted fields are deprecated and will be removed in the future.

The ability to create new scripted fields in the Data Views management page has been disabled in 9.0, and it is recommended to migrate to [runtime fields]({runtimeFieldsLink}) or the [Elasticsearch Query Language (ES|QL)]({esqlLink}) instead.

### Migration examples

The following code snippets demonstrate how an example scripted field called \`computed_values\` on the Kibana Sample Data Logs data view could be migrated to either a runtime field or an ES|QL query, highlighting the differences between each approach such as multi-value field handling.

#### Scripted field

In the scripted field example, variables are created to track all values the script will need to access or return. Since scripted fields can only return a single value, the created variables must be returned together as an array at the end of the script.

\`\`\`
int hour_of_day = $('@timestamp', ZonedDateTime.parse('1970-01-01T00:00:00Z')).getHour();
def time_of_day = '';

if (hour_of_day >= 22 || hour_of_day < 5)
  time_of_day = 'Night';
else if (hour_of_day < 12)
  time_of_day = 'Morning';
else if (hour_of_day < 18)
  time_of_day = 'Afternoon';
else
  time_of_day = 'Evening';

int response_int = Integer.parseInt($('response.keyword', '200'));
def response_category = '';

if (response_int < 200)
  response_category = 'Informational';
else if (response_int < 300)
  response_category = 'Successful';
else if (response_int < 400)
  response_category = 'Redirection';
else if (response_int < 500)
  response_category = 'Client Error';
else
  response_category = 'Server Error';

return [time_of_day, response_category];
\`\`\`

#### Runtime field

Unlike scripted fields, runtime fields do not need to return a single value and can emit values at any point in the script, which will be combined and returned as a multi-value field. This allows for more flexibility in the script logic and removes the need to manually manage an array of values. Otherwise the scripts are essentially identical since they both use the Painless language and the same APIs.

\`\`\`
def hour_of_day = $('@timestamp', ZonedDateTime.parse('1970-01-01T00:00:00Z')).getHour();

if (hour_of_day >= 22 || hour_of_day < 5)
  emit('Night');
else if (hour_of_day < 12)
  emit('Morning');
else if (hour_of_day < 18)
  emit('Afternoon');
else
  emit('Evening');

def response_int = Integer.parseInt($('response.keyword', '200'));

if (response_int < 200)
  emit('Informational');
else if (response_int < 300)
  emit('Successful');
else if (response_int < 400)
  emit('Redirection');
else if (response_int < 500)
  emit('Client Error');
else
  emit('Server Error');
\`\`\`

#### ES|QL query

Alternatively, ES|QL can be used to skip the need for data view management entirely and simply compute the values you need at query time. ES|QL supports computing multiple field values in a single query, using computed values with its rich set of commands and functions, and even aggregations against computed values. This makes it an excellent solution for one-off queries and realtime data analysis.

\`\`\`
FROM kibana_sample_data_logs
  | EVAL hour_of_day = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
  | EVAL time_of_day = CASE(
      hour_of_day >= 22 OR hour_of_day < 5, "Night",
      hour_of_day < 12, "Morning",
      hour_of_day < 18, "Afternoon",
      "Evening"
    )
  | EVAL response_int = TO_INTEGER(response)
  | EVAL response_category = CASE(
      response_int < 200, "Informational",
      response_int < 300, "Successful",
      response_int < 400, "Redirection",
      response_int < 500, "Client Error",
      "Server Error"
    )
  | EVAL computed_values = MV_APPEND(time_of_day, response_category)
  | DROP hour_of_day, time_of_day, response_int, response_category
\`\`\`

### Impacted data views

The following is a list of all data views with scripted fields and their associated spaces:
{dataViewsList}
`,
    values: {
      numberOfDataViewsWithScriptedFields: dataViewsWithScriptedFields.length,
      runtimeFieldsLink: docLinks.runtimeFields.overview,
      esqlLink: docLinks.query.queryESQL,
      dataViewsTableBody: dataViewsWithScriptedFields
        .map((so) => `| ${so.id} | ${so.attributes.title} | ${(so.namespaces ?? []).join(', ')} |`)
        .join('\n'),
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
