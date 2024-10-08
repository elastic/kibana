/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

i18n.translate('basic', {
  defaultMessage: 'i18n.translate default message',
});

i18n.translate('with_ICU_value', {
  defaultMessage: 'I have a basic ICU {VALUE_HERE} message',
  values: {
    VALUE_HERE: 'variable value',
  },
});

export const INTERVAL_MINIMUM_TEXT = (minimum: string) =>
  i18n.translate('value_defined_as_variable', {
    defaultMessage: 'Interval must be at least {minimum}.',
    values: { minimum },
  });

i18n.translate('with_nested_i18n', {
  defaultMessage: 'The {formatLink} for pretty formatted dates.',
  values: {
    formatLink: i18n.translate('i_am_nested_inside', { defaultMessage: 'format' }),
  },
});

i18n.translate('with_html_tags_nested_variables_inside', {
  defaultMessage: `Allows you to set which shards handle your search requests.
    <ul>
      <li><strong>{sessionId}:</strong> restricts operations to execute all search requests on the same shards.
        This has the benefit of reusing shard caches across requests.</li>
      <li><strong>{custom}:</strong> allows you to define a your own preference.
        Use <strong>courier:customRequestPreference</strong> to customize your preference value.</li>
      <li><strong>{none}:</strong> means do not set a preference.
        This might provide better performance because requests can be spread across all shard copies.
        However, results might be inconsistent because different shards might be in different refresh states.</li>
    </ul>`,
  values: {
    sessionId: '123',
    custom: 'css',
    none: 'noon',
    ul: (chunks) => `<ul>${chunks}</ul>`,
    li: (chunks) => `<li>${chunks}</li>`,
    strong: (chunks) => `<strong>${chunks}</strong>`,
  },
});

i18n.translate('with_ignored_tags', {
  defaultMessage:
    'Update {numberOfIndexPatternsWithScriptedFields} data views that have scripted fields to use runtime fields instead. In most cases, to migrate existing scripts, you will need to change "return <value>;" to "emit(<value>);". Data views with at least one scripted field: {allTitles}',
  values: {
    allTitles: 'all the titles',
    numberOfIndexPatternsWithScriptedFields: '123',
  },
  ignoreTag: true,
});

const aggName = '123';
const agg = {
  fixed_interval: 13,
  delay: false,
  time_zone: 'UTC',
};

i18n.translate('complext_nesting', {
  defaultMessage: '{aggName} (interval: {interval}, {delay} {time_zone})',
  values: {
    aggName,
    interval: agg.fixed_interval,
    delay: agg.delay
      ? i18n.translate('i_am_optional_nested_inside', {
          defaultMessage: 'delay: {delay},',
          values: {
            delay: agg.delay,
          },
        })
      : '',
    time_zone: agg.time_zone,
  },
});
i18n.translate('double_tagged', {
  defaultMessage:
    'Returns the maximum value from multiple columns. This is similar to <<esql-mv_max>>\nexcept it is intended to run on multiple columns at once.',
  ignoreTag: true,
});

i18n.translate('select_syntax', {
  defaultMessage: `{rangeType, select,
      between {Must be between {min} and {max}}
      gt {Must be greater than {min}}
      lt {Must be less than {max}}
      other {Must be an integer}
    }`,
  values: {
    min: 20,
    max: 40,
    rangeType: 'gt',
  },
});

i18n.translate('plural_syntax_with_nested_variable', {
  values: { totalCases: 1, severity: 'high', caseTitle: 'ok' },
  defaultMessage:
    '{totalCases, plural, =1 {Case "{caseTitle}" was} other {{totalCases} cases were}} set to {severity}',
});
