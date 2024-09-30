/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { SuggestionRawDefinition, GetFieldsByTypeFn } from '../types';

export const getRecommendedQueries = async (
  getFieldsByType: GetFieldsByTypeFn
): Promise<SuggestionRawDefinition[]> => {
  const fieldSuggestions = await getFieldsByType('date', [], {
    openSuggestions: true,
  });

  const suggestions: SuggestionRawDefinition[] = [
    {
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.countAgg.label',
        {
          defaultMessage: 'Aggregate data with STATS',
        }
      ),
      text: ` | STATS count = COUNT(*) `,
      kind: 'Issue',
      detail: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.countAgg.detail',
        {
          defaultMessage: 'Count aggregation',
        }
      ),
      sortText: 'D',
    },
    {
      label: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.conditional.label',
        {
          defaultMessage: 'Create a conditional with CASE',
        }
      ),
      text: ` | STATS count =  COUNT(*) | EVAL newField = CASE(count < 100, "groupA", count > 100 and count < 500, "groupB", "Other") | KEEP newField `,
      kind: 'Issue',
      detail: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.conditional.detail',
        {
          defaultMessage: 'Conditional',
        }
      ),
      sortText: 'D',
    },
  ];

  if (fieldSuggestions.length) {
    const timeField =
      fieldSuggestions?.find((field) => field.label === '@timestamp')?.label ||
      fieldSuggestions[0].label;
    suggestions.push(
      {
        label: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.dateHistogram.label',
          {
            defaultMessage: 'Create a date histogram',
          }
        ),
        text: ` | WHERE ${timeField} <=?_tend and ${timeField} >?_tstart | STATS count = COUNT(*) BY BUCKET(${timeField}, 50, ?_tstart, ?_tend) `,
        kind: 'Issue',
        detail: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.dateHistogram.details',
          {
            defaultMessage: 'Count aggregation with date histogram',
          }
        ),
        sortText: 'D',
      },
      {
        label: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.sortByTime.label',
          {
            defaultMessage: 'Sort by time',
          }
        ),
        text: ` | SORT ${timeField} DESC `,
        kind: 'Issue',
        detail: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.sortByTime.detail',
          {
            defaultMessage: 'Sort by time',
          }
        ),
        sortText: 'D',
      },
      {
        label: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.dateIntervals.label',
          {
            defaultMessage: 'Create field with EVAL',
          }
        ),
        text: ` | EVAL buckets = DATE_TRUNC(5 minute, ${timeField}) | KEEP buckets `,
        kind: 'Issue',
        detail: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.autocomplete.recommended.dateIntervals.detail',
          {
            defaultMessage: 'Sort by time',
          }
        ),
        sortText: 'D',
      }
    );
  }
  return suggestions;
};
