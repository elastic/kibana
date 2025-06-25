/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

// Order starts with the simple ones and goes to more complex ones

export const getRecommendedQueries = ({
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
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.recommendedQueries.aggregateExample.label',
        {
          defaultMessage: 'Aggregate with STATS',
        }
      ),
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.recommendedQueries.aggregateExample.description',
        {
          defaultMessage: 'Count aggregation',
        }
      ),
      queryString: `${fromCommand}\n  | STATS count = COUNT(*) /* you can group by a field using the BY operator */`,
    },
    {
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.recommendedQueries.searchExample.label',
        {
          defaultMessage: 'Search all fields',
        }
      ),
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.recommendedQueries.searchExample.description',
        {
          defaultMessage: 'Use WHERE to filter/search data',
        }
      ),
      queryString: `${fromCommand}\n  | WHERE QSTR("""term""") /* Search all fields using QSTR – e.g. WHERE QSTR("""debug""") */`,
      sortText: 'D',
    },
    ...(timeField
      ? [
          {
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.sortByTime.label',
              {
                defaultMessage: 'Sort by time',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.sortByTime.description',
              {
                defaultMessage: 'Sort by time',
              }
            ),
            queryString: `${fromCommand}\n  | SORT ${timeField} /* Data is not sorted by default */`,
          },
          {
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.dateIntervals.label',
              {
                defaultMessage: 'Create 5 minute time buckets with EVAL',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.dateIntervals.description',
              {
                defaultMessage: 'Count aggregation over time',
              }
            ),
            queryString: `${fromCommand}\n  | EVAL buckets = DATE_TRUNC(5 minute, ${timeField}) | STATS count = COUNT(*) BY buckets /* try out different intervals */`,
          },
        ]
      : []),
    {
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.recommendedQueries.caseExample.label',
        {
          defaultMessage: 'Create a conditional with CASE',
        }
      ),
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.recommendedQueries.caseExample.description',
        {
          defaultMessage: 'Conditional',
        }
      ),
      queryString: `${fromCommand}\n  | STATS count = COUNT(*)\n  | EVAL newField = CASE(count < 100, "groupA", count > 100 and count < 500, "groupB", "Other")\n  | KEEP newField`,
    },
    ...(timeField
      ? [
          {
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.dateHistogram.label',
              {
                defaultMessage: 'Create a date histogram',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.dateHistogram.description',
              {
                defaultMessage: 'Count aggregation over time',
              }
            ),
            queryString: `${fromCommand}\n  | WHERE ${timeField} <=?_tend and ${timeField} >?_tstart\n  | STATS count = COUNT(*) BY \`Over time\` = BUCKET(${timeField}, 50, ?_tstart, ?_tend) /* ?_tstart and ?_tend take the values of the time picker */`,
          },
          {
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.eventRate.label',
              {
                defaultMessage: 'Calculate the event rate',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.eventRate.description',
              {
                defaultMessage: 'Event rate over time',
              }
            ),
            queryString: `${fromCommand}\n  | STATS count = COUNT(*), min_timestamp = MIN(${timeField}) /* MIN(dateField) finds the earliest timestamp in the dataset. */ \n  | EVAL event_rate = count / DATE_DIFF("seconds", min_timestamp, NOW()) /* Calculates the event rate by dividing the total count of events by the time difference (in seconds) between the earliest event and the current time. */\n | KEEP event_rate`,
          },
          {
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.categorize.label',
              {
                defaultMessage: 'Detect change points',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.categorize.description',
              {
                defaultMessage: 'Change point on count aggregation',
              }
            ),
            queryString: `${fromCommand}\n | WHERE ${timeField} <=?_tend and ${timeField} >?_tstart\n | STATS count = COUNT(*) BY buckets = BUCKET(${timeField}, 50, ?_tstart, ?_tend) \n | CHANGE_POINT count ON buckets `,
          },
          {
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.lastHour.label',
              {
                defaultMessage: 'Total count vs count last hour',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.lastHour.description',
              {
                defaultMessage: 'A more complicated example',
              }
            ),
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
            label: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.patternAnalysis.label',
              {
                defaultMessage: 'Identify patterns',
              }
            ),
            description: i18n.translate(
              'kbn-esql-validation-autocomplete.recommendedQueries.patternAnalysis.description',
              {
                defaultMessage: 'Use the CATEGORIZE function to identify patterns in your logs',
              }
            ),
            queryString: `${fromCommand}\n  | STATS Count=COUNT(*) BY Pattern=CATEGORIZE(${categorizationField})\n  | SORT Count DESC`,
          },
        ]
      : []),
  ];
  return queries;
};
