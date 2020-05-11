/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
// @ts-ignore
import numeralLanguages from '@elastic/numeral/languages';
import { CoreSetup } from '../../../../src/core/server';
import { DEFAULT_QUERY_LANGUAGE } from '../common';

const luceneQueryLanguageLabel = i18n.translate('kbn.advancedSettings.searchQueryLanguageLucene', {
  defaultMessage: 'Lucene',
});

const queryLanguageSettingName = i18n.translate('kbn.advancedSettings.searchQueryLanguageTitle', {
  defaultMessage: 'Query language',
});

const requestPreferenceOptionLabels = {
  sessionId: i18n.translate('kbn.advancedSettings.courier.requestPreferenceSessionId', {
    defaultMessage: 'Session ID',
  }),
  custom: i18n.translate('kbn.advancedSettings.courier.requestPreferenceCustom', {
    defaultMessage: 'Custom',
  }),
  none: i18n.translate('kbn.advancedSettings.courier.requestPreferenceNone', {
    defaultMessage: 'None',
  }),
};

// We add the `en` key manually here, since that's not a real numeral locale, but the
// default fallback in case the locale is not found.
const numeralLanguageIds = [
  'en',
  ...numeralLanguages.map((numeralLanguage: any) => {
    return numeralLanguage.id;
  }),
];

export function initUiSettings(uiSettings: CoreSetup['uiSettings']) {
  uiSettings.register({
    'query:queryString:options': {
      name: i18n.translate('kbn.advancedSettings.query.queryStringOptionsTitle', {
        defaultMessage: 'Query string options',
      }),
      value: '{ "analyze_wildcard": true }',
      description: i18n.translate('kbn.advancedSettings.query.queryStringOptionsText', {
        defaultMessage:
          '{optionsLink} for the lucene query string parser. Is only used when "{queryLanguage}" is set ' +
          'to {luceneLanguage}.',
        description:
          'Part of composite text: kbn.advancedSettings.query.queryStringOptions.optionsLinkText + ' +
          'kbn.advancedSettings.query.queryStringOptionsText',
        values: {
          optionsLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html" target="_blank" rel="noopener">' +
            i18n.translate('kbn.advancedSettings.query.queryStringOptions.optionsLinkText', {
              defaultMessage: 'Options',
            }) +
            '</a>',
          luceneLanguage: luceneQueryLanguageLabel,
          queryLanguage: queryLanguageSettingName,
        },
      }),
      type: 'json',
      schema: schema.object({
        analyze_wildcard: schema.boolean(),
      }),
    },
    'query:allowLeadingWildcards': {
      name: i18n.translate('kbn.advancedSettings.query.allowWildcardsTitle', {
        defaultMessage: 'Allow leading wildcards in query',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.query.allowWildcardsText', {
        defaultMessage:
          'When set, * is allowed as the first character in a query clause. ' +
          'Currently only applies when experimental query features are enabled in the query bar. ' +
          'To disallow leading wildcards in basic lucene queries, use {queryStringOptionsPattern}.',
        values: {
          queryStringOptionsPattern: 'query:queryString:options',
        },
      }),
      schema: schema.boolean(),
    },
    'search:queryLanguage': {
      name: queryLanguageSettingName,
      value: DEFAULT_QUERY_LANGUAGE,
      description: i18n.translate('kbn.advancedSettings.searchQueryLanguageText', {
        defaultMessage:
          'Query language used by the query bar. KQL is a new language built specifically for Kibana.',
      }),
      type: 'select',
      options: ['lucene', 'kuery'],
      optionLabels: {
        lucene: luceneQueryLanguageLabel,
        kuery: i18n.translate('kbn.advancedSettings.searchQueryLanguageKql', {
          defaultMessage: 'KQL',
        }),
      },
      schema: schema.string(),
    },
    'sort:options': {
      name: i18n.translate('kbn.advancedSettings.sortOptionsTitle', {
        defaultMessage: 'Sort options',
      }),
      value: '{ "unmapped_type": "boolean" }',
      description: i18n.translate('kbn.advancedSettings.sortOptionsText', {
        defaultMessage: '{optionsLink} for the Elasticsearch sort parameter',
        description:
          'Part of composite text: kbn.advancedSettings.sortOptions.optionsLinkText + ' +
          'kbn.advancedSettings.sortOptionsText',
        values: {
          optionsLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html" target="_blank" rel="noopener">' +
            i18n.translate('kbn.advancedSettings.sortOptions.optionsLinkText', {
              defaultMessage: 'Options',
            }) +
            '</a>',
        },
      }),
      type: 'json',
      schema: schema.object({
        unmapped_type: schema.string(),
      }),
    },
    defaultIndex: {
      name: i18n.translate('kbn.advancedSettings.defaultIndexTitle', {
        defaultMessage: 'Default index',
      }),
      value: null,
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.defaultIndexText', {
        defaultMessage: 'The index to access if no index is set',
      }),
      schema: schema.nullable(schema.string()),
    },
    'courier:ignoreFilterIfFieldNotInIndex': {
      name: i18n.translate('kbn.advancedSettings.courier.ignoreFilterTitle', {
        defaultMessage: 'Ignore filter(s)',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.courier.ignoreFilterText', {
        defaultMessage:
          'This configuration enhances support for dashboards containing visualizations accessing dissimilar indexes. ' +
          'When disabled, all filters are applied to all visualizations. ' +
          'When enabled, filter(s) will be ignored for a visualization ' +
          `when the visualization's index does not contain the filtering field.`,
      }),
      category: ['search'],
      schema: schema.boolean(),
    },
    'courier:setRequestPreference': {
      name: i18n.translate('kbn.advancedSettings.courier.requestPreferenceTitle', {
        defaultMessage: 'Request preference',
      }),
      value: 'sessionId',
      options: ['sessionId', 'custom', 'none'],
      optionLabels: requestPreferenceOptionLabels,
      type: 'select',
      description: i18n.translate('kbn.advancedSettings.courier.requestPreferenceText', {
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
          sessionId: requestPreferenceOptionLabels.sessionId,
          custom: requestPreferenceOptionLabels.custom,
          none: requestPreferenceOptionLabels.none,
        },
      }),
      category: ['search'],
      schema: schema.string(),
    },
    'courier:customRequestPreference': {
      name: i18n.translate('kbn.advancedSettings.courier.customRequestPreferenceTitle', {
        defaultMessage: 'Custom request preference',
      }),
      value: '_local',
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.courier.customRequestPreferenceText', {
        defaultMessage:
          '{requestPreferenceLink} used when {setRequestReferenceSetting} is set to {customSettingValue}.',
        description:
          'Part of composite text: kbn.advancedSettings.courier.customRequestPreference.requestPreferenceLinkText + ' +
          'kbn.advancedSettings.courier.customRequestPreferenceText',
        values: {
          setRequestReferenceSetting: '<strong>courier:setRequestPreference</strong>',
          customSettingValue: '"custom"',
          requestPreferenceLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-preference.html" target="_blank" rel="noopener">' +
            i18n.translate(
              'kbn.advancedSettings.courier.customRequestPreference.requestPreferenceLinkText',
              {
                defaultMessage: 'Request Preference',
              }
            ) +
            '</a>',
        },
      }),
      category: ['search'],
      schema: schema.string(),
    },
    'courier:maxConcurrentShardRequests': {
      name: i18n.translate('kbn.advancedSettings.courier.maxRequestsTitle', {
        defaultMessage: 'Max Concurrent Shard Requests',
      }),
      value: 0,
      type: 'number',
      description: i18n.translate('kbn.advancedSettings.courier.maxRequestsText', {
        defaultMessage:
          'Controls the {maxRequestsLink} setting used for _msearch requests sent by Kibana. ' +
          'Set to 0 to disable this config and use the Elasticsearch default.',
        values: {
          maxRequestsLink: `<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html"
            target="_blank" rel="noopener" >max_concurrent_shard_requests</a>`,
        },
      }),
      category: ['search'],
      schema: schema.number(),
    },
    'courier:batchSearches': {
      name: i18n.translate('kbn.advancedSettings.courier.batchSearchesTitle', {
        defaultMessage: 'Batch concurrent searches',
      }),
      value: false,
      type: 'boolean',
      description: i18n.translate('kbn.advancedSettings.courier.batchSearchesText', {
        defaultMessage: `When disabled, dashboard panels will load individually, and search requests will terminate when users navigate
           away or update the query. When enabled, dashboard panels will load together when all of the data is loaded, and
           searches will not terminate.`,
      }),
      deprecation: {
        message: i18n.translate('kbn.advancedSettings.courier.batchSearchesTextDeprecation', {
          defaultMessage: 'This setting is deprecated and will be removed in Kibana 8.0.',
        }),
        docLinksKey: 'kibanaSearchSettings',
      },
      category: ['search'],
      schema: schema.boolean(),
    },
    'search:includeFrozen': {
      name: 'Search in frozen indices',
      description: `Will include <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/frozen-indices.html"
        target="_blank" rel="noopener">frozen indices</a> in results if enabled. Searching through frozen indices
        might increase the search time.`,
      value: false,
      category: ['search'],
      schema: schema.boolean(),
    },
    'histogram:barTarget': {
      name: i18n.translate('kbn.advancedSettings.histogram.barTargetTitle', {
        defaultMessage: 'Target bars',
      }),
      value: 50,
      description: i18n.translate('kbn.advancedSettings.histogram.barTargetText', {
        defaultMessage:
          'Attempt to generate around this many bars when using "auto" interval in date histograms',
      }),
      schema: schema.number(),
    },
    'histogram:maxBars': {
      name: i18n.translate('kbn.advancedSettings.histogram.maxBarsTitle', {
        defaultMessage: 'Maximum bars',
      }),
      value: 100,
      description: i18n.translate('kbn.advancedSettings.histogram.maxBarsText', {
        defaultMessage:
          'Never show more than this many bars in date histograms, scale values if needed',
      }),
      schema: schema.number(),
    },
    'history:limit': {
      name: i18n.translate('kbn.advancedSettings.historyLimitTitle', {
        defaultMessage: 'History limit',
      }),
      value: 10,
      description: i18n.translate('kbn.advancedSettings.historyLimitText', {
        defaultMessage:
          'In fields that have history (e.g. query inputs), show this many recent values',
      }),
      schema: schema.number(),
    },
    'shortDots:enable': {
      name: i18n.translate('kbn.advancedSettings.shortenFieldsTitle', {
        defaultMessage: 'Shorten fields',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.shortenFieldsText', {
        defaultMessage: 'Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz',
      }),
      schema: schema.boolean(),
    },
    'format:defaultTypeMap': {
      name: i18n.translate('kbn.advancedSettings.format.defaultTypeMapTitle', {
        defaultMessage: 'Field type format name',
      }),
      value: `{
  "ip": { "id": "ip", "params": {} },
  "date": { "id": "date", "params": {} },
  "date_nanos": { "id": "date_nanos", "params": {}, "es": true },
  "number": { "id": "number", "params": {} },
  "boolean": { "id": "boolean", "params": {} },
  "_source": { "id": "_source", "params": {} },
  "_default_": { "id": "string", "params": {} }
}`,
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.format.defaultTypeMapText', {
        defaultMessage:
          'Map of the format name to use by default for each field type. ' +
          '{defaultFormat} is used if the field type is not mentioned explicitly',
        values: {
          defaultFormat: '"_default_"',
        },
      }),
      schema: schema.object({
        ip: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        date: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        date_nanos: schema.object({
          id: schema.string(),
          params: schema.object({}),
          es: schema.boolean(),
        }),
        number: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        boolean: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        _source: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
        _default_: schema.object({
          id: schema.string(),
          params: schema.object({}),
        }),
      }),
    },
    'format:number:defaultPattern': {
      name: i18n.translate('kbn.advancedSettings.format.numberFormatTitle', {
        defaultMessage: 'Number format',
      }),
      value: '0,0.[000]',
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.format.numberFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "number" format',
        description:
          'Part of composite text: kbn.advancedSettings.format.numberFormatText + ' +
          'kbn.advancedSettings.format.numberFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.format.numberFormat.numeralFormatLinkText', {
              defaultMessage: 'numeral format',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'format:percent:defaultPattern': {
      name: i18n.translate('kbn.advancedSettings.format.percentFormatTitle', {
        defaultMessage: 'Percent format',
      }),
      value: '0,0.[000]%',
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.format.percentFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "percent" format',
        description:
          'Part of composite text: kbn.advancedSettings.format.percentFormatText + ' +
          'kbn.advancedSettings.format.percentFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.format.percentFormat.numeralFormatLinkText', {
              defaultMessage: 'numeral format',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'format:bytes:defaultPattern': {
      name: i18n.translate('kbn.advancedSettings.format.bytesFormatTitle', {
        defaultMessage: 'Bytes format',
      }),
      value: '0,0.[0]b',
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.format.bytesFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "bytes" format',
        description:
          'Part of composite text: kbn.advancedSettings.format.bytesFormatText + ' +
          'kbn.advancedSettings.format.bytesFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.format.bytesFormat.numeralFormatLinkText', {
              defaultMessage: 'numeral format',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'format:currency:defaultPattern': {
      name: i18n.translate('kbn.advancedSettings.format.currencyFormatTitle', {
        defaultMessage: 'Currency format',
      }),
      value: '($0,0.[00])',
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.format.currencyFormatText', {
        defaultMessage: 'Default {numeralFormatLink} for the "currency" format',
        description:
          'Part of composite text: kbn.advancedSettings.format.currencyFormatText + ' +
          'kbn.advancedSettings.format.currencyFormat.numeralFormatLinkText',
        values: {
          numeralFormatLink:
            '<a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.format.currencyFormat.numeralFormatLinkText', {
              defaultMessage: 'numeral format',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'format:number:defaultLocale': {
      name: i18n.translate('kbn.advancedSettings.format.formattingLocaleTitle', {
        defaultMessage: 'Formatting locale',
      }),
      value: 'en',
      type: 'select',
      options: numeralLanguageIds,
      optionLabels: Object.fromEntries(
        numeralLanguages.map((language: Record<string, any>) => [language.id, language.name])
      ),
      description: i18n.translate('kbn.advancedSettings.format.formattingLocaleText', {
        defaultMessage: `{numeralLanguageLink} locale`,
        description:
          'Part of composite text: kbn.advancedSettings.format.formattingLocale.numeralLanguageLinkText + ' +
          'kbn.advancedSettings.format.formattingLocaleText',
        values: {
          numeralLanguageLink:
            '<a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.format.formattingLocale.numeralLanguageLinkText', {
              defaultMessage: 'Numeral language',
            }) +
            '</a>',
        },
      }),
      schema: schema.string(),
    },
    'timepicker:refreshIntervalDefaults': {
      name: i18n.translate('kbn.advancedSettings.timepicker.refreshIntervalDefaultsTitle', {
        defaultMessage: 'Time filter refresh interval',
      }),
      value: `{
  "pause": false,
  "value": 0
}`,
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.timepicker.refreshIntervalDefaultsText', {
        defaultMessage: `The timefilter's default refresh interval`,
      }),
      requiresPageReload: true,
      schema: schema.object({
        pause: schema.boolean(),
        value: schema.number(),
      }),
    },
    'timepicker:quickRanges': {
      name: i18n.translate('kbn.advancedSettings.timepicker.quickRangesTitle', {
        defaultMessage: 'Time filter quick ranges',
      }),
      value: JSON.stringify(
        [
          {
            from: 'now/d',
            to: 'now/d',
            display: i18n.translate('kbn.advancedSettings.timepicker.today', {
              defaultMessage: 'Today',
            }),
          },
          {
            from: 'now/w',
            to: 'now/w',
            display: i18n.translate('kbn.advancedSettings.timepicker.thisWeek', {
              defaultMessage: 'This week',
            }),
          },
          {
            from: 'now-15m',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last15Minutes', {
              defaultMessage: 'Last 15 minutes',
            }),
          },
          {
            from: 'now-30m',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last30Minutes', {
              defaultMessage: 'Last 30 minutes',
            }),
          },
          {
            from: 'now-1h',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last1Hour', {
              defaultMessage: 'Last 1 hour',
            }),
          },
          {
            from: 'now-24h',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last24Hours', {
              defaultMessage: 'Last 24 hours',
            }),
          },
          {
            from: 'now-7d',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last7Days', {
              defaultMessage: 'Last 7 days',
            }),
          },
          {
            from: 'now-30d',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last30Days', {
              defaultMessage: 'Last 30 days',
            }),
          },
          {
            from: 'now-90d',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last90Days', {
              defaultMessage: 'Last 90 days',
            }),
          },
          {
            from: 'now-1y',
            to: 'now',
            display: i18n.translate('kbn.advancedSettings.timepicker.last1Year', {
              defaultMessage: 'Last 1 year',
            }),
          },
        ],
        null,
        2
      ),
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.timepicker.quickRangesText', {
        defaultMessage:
          'The list of ranges to show in the Quick section of the time filter. This should be an array of objects, ' +
          'with each object containing "from", "to" (see {acceptedFormatsLink}), and ' +
          '"display" (the title to be displayed).',
        description:
          'Part of composite text: kbn.advancedSettings.timepicker.quickRangesText + ' +
          'kbn.advancedSettings.timepicker.quickRanges.acceptedFormatsLinkText',
        values: {
          acceptedFormatsLink:
            `<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math"
            target="_blank" rel="noopener">` +
            i18n.translate('kbn.advancedSettings.timepicker.quickRanges.acceptedFormatsLinkText', {
              defaultMessage: 'accepted formats',
            }) +
            '</a>',
        },
      }),
      schema: schema.arrayOf(
        schema.object({
          from: schema.string(),
          to: schema.string(),
          display: schema.string(),
        })
      ),
    },
    'indexPattern:placeholder': {
      name: i18n.translate('kbn.advancedSettings.indexPatternPlaceholderTitle', {
        defaultMessage: 'Index pattern placeholder',
      }),
      value: '',
      description: i18n.translate('kbn.advancedSettings.indexPatternPlaceholderText', {
        defaultMessage:
          'The placeholder for the "Index pattern name" field in "Management > Index Patterns > Create Index Pattern".',
      }),
      schema: schema.string(),
    },
    'filters:pinnedByDefault': {
      name: i18n.translate('kbn.advancedSettings.pinFiltersTitle', {
        defaultMessage: 'Pin filters by default',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.pinFiltersText', {
        defaultMessage: 'Whether the filters should have a global state (be pinned) by default',
      }),
      schema: schema.boolean(),
    },
    'filterEditor:suggestValues': {
      name: i18n.translate('kbn.advancedSettings.suggestFilterValuesTitle', {
        defaultMessage: 'Filter editor suggest values',
        description: '"Filter editor" refers to the UI you create filters in.',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.suggestFilterValuesText', {
        defaultMessage:
          'Set this property to false to prevent the filter editor from suggesting values for fields.',
      }),
      schema: schema.boolean(),
    },
  });
}
