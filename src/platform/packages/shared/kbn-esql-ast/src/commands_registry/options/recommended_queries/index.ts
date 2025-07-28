/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { RecommendedQuery, RecommendedField } from '@kbn/esql-types';
import { GetColumnsByTypeFn, ISuggestionItem } from '../../types';
import { METADATA_FIELDS } from '../metadata';

export interface EditorExtensions {
  recommendedQueries: RecommendedQuery[];
  recommendedFields: RecommendedField[];
}

// Order starts with the simple ones and goes to more complex ones

export const getRecommendedQueriesTemplates = ({
  fromCommand,
  timeField,
  categorizationField,
}: {
  fromCommand: string;
  timeField?: string;
  categorizationField?: string;
}) => {
  const queries = [
    {
      label: i18n.translate('kbn-esql-ast.recommendedQueries.aggregateExample.label', {
        defaultMessage: 'Aggregate with STATS',
      }),
      description: i18n.translate('kbn-esql-ast.recommendedQueries.aggregateExample.description', {
        defaultMessage: 'Count aggregation',
      }),
      queryString: `${fromCommand}\n  | STATS count = COUNT(*) /* you can group by a field using the BY operator */`,
    },
    {
      label: i18n.translate('kbn-esql-ast.recommendedQueries.searchExample.label', {
        defaultMessage: 'Search all fields',
      }),
      description: i18n.translate('kbn-esql-ast.recommendedQueries.searchExample.description', {
        defaultMessage: 'Use WHERE to filter/search data',
      }),
      queryString: `${fromCommand}\n  | WHERE QSTR("""term""") /* Search all fields using QSTR – e.g. WHERE QSTR("""debug""") */`,
      sortText: 'D',
    },
    ...(timeField
      ? [
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.sortByTime.label', {
              defaultMessage: 'Sort by time',
            }),
            description: i18n.translate('kbn-esql-ast.recommendedQueries.sortByTime.description', {
              defaultMessage: 'Sort by time',
            }),
            queryString: `${fromCommand}\n  | SORT ${timeField} /* Data is not sorted by default */`,
          },
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.dateIntervals.label', {
              defaultMessage: 'Create 5 minute time buckets with EVAL',
            }),
            description: i18n.translate(
              'kbn-esql-ast.recommendedQueries.dateIntervals.description',
              {
                defaultMessage: 'Count aggregation over time',
              }
            ),
            queryString: `${fromCommand}\n  | EVAL buckets = DATE_TRUNC(5 minute, ${timeField}) | STATS count = COUNT(*) BY buckets /* try out different intervals */`,
          },
        ]
      : []),
    {
      label: i18n.translate('kbn-esql-ast.recommendedQueries.caseExample.label', {
        defaultMessage: 'Create a conditional with CASE',
      }),
      description: i18n.translate('kbn-esql-ast.recommendedQueries.caseExample.description', {
        defaultMessage: 'Conditional',
      }),
      queryString: `${fromCommand}\n  | STATS count = COUNT(*)\n  | EVAL newField = CASE(count < 100, "groupA", count > 100 and count < 500, "groupB", "Other")\n  | KEEP newField`,
    },
    ...(timeField
      ? [
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.dateHistogram.label', {
              defaultMessage: 'Create a date histogram',
            }),
            description: i18n.translate(
              'kbn-esql-ast.recommendedQueries.dateHistogram.description',
              {
                defaultMessage: 'Count aggregation over time',
              }
            ),
            queryString: `${fromCommand}\n  | WHERE ${timeField} <=?_tend and ${timeField} >?_tstart\n  | STATS count = COUNT(*) BY \`Over time\` = BUCKET(${timeField}, 50, ?_tstart, ?_tend) /* ?_tstart and ?_tend take the values of the time picker */`,
          },
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.eventRate.label', {
              defaultMessage: 'Calculate the event rate',
            }),
            description: i18n.translate('kbn-esql-ast.recommendedQueries.eventRate.description', {
              defaultMessage: 'Event rate over time',
            }),
            queryString: `${fromCommand}\n  | STATS count = COUNT(*), min_timestamp = MIN(${timeField}) /* MIN(dateField) finds the earliest timestamp in the dataset. */ \n  | EVAL event_rate = count / DATE_DIFF("seconds", min_timestamp, NOW()) /* Calculates the event rate by dividing the total count of events by the time difference (in seconds) between the earliest event and the current time. */\n | KEEP event_rate`,
          },
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.categorize.label', {
              // TODO this item should be hidden if AIOps is disabled or we're not running with a platinum license
              // the capability aiops.enabled can be used to check both of these conditions
              defaultMessage: 'Detect change points',
            }),
            description: i18n.translate('kbn-esql-ast.recommendedQueries.categorize.description', {
              defaultMessage: 'Change point on count aggregation',
            }),
            queryString: `${fromCommand}\n | WHERE ${timeField} <=?_tend and ${timeField} >?_tstart\n | STATS count = COUNT(*) BY buckets = BUCKET(${timeField}, 50, ?_tstart, ?_tend) \n | CHANGE_POINT count ON buckets `,
          },
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.lastHour.label', {
              defaultMessage: 'Total count vs count last hour',
            }),
            description: i18n.translate('kbn-esql-ast.recommendedQueries.lastHour.description', {
              defaultMessage: 'A more complicated example',
            }),
            queryString: `${fromCommand}
    | SORT ${timeField}
    | EVAL now = NOW()
    | EVAL key = CASE(${timeField} < (now - 1 hour) AND ${timeField} > (now - 2 hour), "Last hour", "Other")
    | STATS count = COUNT(*) BY key
    | EVAL count_last_hour = CASE(key == "Last hour", count), count_rest = CASE(key == "Other", count)
    | EVAL total_visits = TO_DOUBLE(COALESCE(count_last_hour, 0::LONG) + COALESCE(count_rest, 0::LONG))
    | STATS count_last_hour = SUM(count_last_hour), total_visits  = SUM(total_visits)`,
          },
        ]
      : []),
    ...(categorizationField
      ? // TODO this item should be hidden if AIOps is disabled or we're not running with a platinum license
        // the capability aiops.enabled can be used to check both of these conditions
        [
          {
            label: i18n.translate('kbn-esql-ast.recommendedQueries.patternAnalysis.label', {
              defaultMessage: 'Identify patterns',
            }),
            description: i18n.translate(
              'kbn-esql-ast.recommendedQueries.patternAnalysis.description',
              {
                defaultMessage: 'Use the CATEGORIZE function to identify patterns in your logs',
              }
            ),
            queryString: `${fromCommand}\n | SAMPLE .001\n | STATS Count=COUNT(*)/.001 BY Pattern=CATEGORIZE(${categorizationField})\n  | SORT Count DESC`,
          },
        ]
      : []),
  ];
  return queries;
};

export const getRecommendedQueriesSuggestionsFromStaticTemplates = async (
  getFieldsByType: GetColumnsByTypeFn,
  fromCommand: string = ''
): Promise<ISuggestionItem[]> => {
  const [fieldSuggestions, textFieldSuggestions] = await Promise.all([
    getFieldsByType(['date'], [], { openSuggestions: true }),
    // get text fields separately to avoid mixing them with date fields
    getFieldsByType(['text'], [], { openSuggestions: true }),
  ]);

  let timeField = '';
  let categorizationField: string | undefined = '';

  if (fieldSuggestions.length) {
    timeField =
      fieldSuggestions?.find((field) => field.label === '@timestamp')?.label ||
      fieldSuggestions[0].label;
  }

  if (textFieldSuggestions.length) {
    categorizationField = getCategorizationField(textFieldSuggestions.map((field) => field.label));
  }

  const recommendedQueries = getRecommendedQueriesTemplates({
    fromCommand,
    timeField,
    categorizationField,
  });

  const suggestions: ISuggestionItem[] = recommendedQueries.map((query) => {
    return {
      label: query.label,
      text: query.queryString,
      kind: 'Issue',
      detail: query.description,
      sortText: query?.sortText ?? 'E',
    };
  });

  return suggestions;
};

/**
 * This function extracts the templates from the recommended queries extensions.
 * The templates are the recommended queries without the source command (FROM).
 * This is useful for showing the templates in the autocomplete suggestions when the users have already typed the FROM command.
 * @param recommendedQueriesExtensions, the recommended queries extensions to extract the templates from
 * @returns ISuggestionItem[], the templates extracted from the recommended queries extensions
 */
export const getRecommendedQueriesTemplatesFromExtensions = (
  recommendedQueriesExtensions: RecommendedQuery[]
): ISuggestionItem[] => {
  if (!recommendedQueriesExtensions || !recommendedQueriesExtensions.length) {
    return [];
  }

  // the templates are the recommended queries without the source command (FROM)
  const recommendedQueriesTemplates: ISuggestionItem[] = recommendedQueriesExtensions.map(
    (recommendedQuery) => {
      const queryParts = recommendedQuery.query.split('|');
      // remove the first part (the FROM command)
      return {
        label: recommendedQuery.name,
        text: `|${queryParts.slice(1).join('|')}`,
        detail: recommendedQuery.name ?? '',
        ...(recommendedQuery.description
          ? { documentation: { value: recommendedQuery.description } }
          : {}),
        kind: 'Issue',
        sortText: 'D',
      };
    }
  );

  return recommendedQueriesTemplates;
};

// Function returning suggestions from static templates and editor extensions
export const getRecommendedQueriesSuggestions = async (
  editorExtensions: EditorExtensions,
  getColumnsByType: GetColumnsByTypeFn,
  prefix: string = ''
) => {
  const recommendedQueriesFromExtensions = getRecommendedQueriesTemplatesFromExtensions(
    editorExtensions.recommendedQueries
  );

  const recommendedQueriesFromTemplates = await getRecommendedQueriesSuggestionsFromStaticTemplates(
    getColumnsByType,
    prefix
  );

  return [...recommendedQueriesFromExtensions, ...recommendedQueriesFromTemplates];
};

/**
 * This function returns the categorization field from the list of fields.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first field from the list,
 * Assumes text fields have been passed in the `fields` array.
 *
 * This function is a duplicate of the one in src/platform/packages/shared/kbn-aiops-utils.
 * It is included here to avoid build errors due to bazel
 *
 * TODO: Remove this function once the bazel issue is resolved.
 *
 * @param fields, the list of fields to check
 * @returns string | undefined, the categorization field if found, otherwise undefined
 */

export function getCategorizationField(fields: string[]): string | undefined {
  const fieldPriority = ['message', 'error.message', 'event.original'];
  const fieldSet = new Set(fields);
  for (const field of fieldPriority) {
    if (fieldSet.has(field)) {
      return field;
    }
  }

  // Filter out metadata fields
  const filteredFields = fields.filter((field) => !METADATA_FIELDS.includes(field));
  return filteredFields[0] ?? undefined;
}
