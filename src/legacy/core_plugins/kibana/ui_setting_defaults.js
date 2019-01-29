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

import moment from 'moment-timezone';
import numeralLanguages from '@elastic/numeral/languages';
import { i18n } from '@kbn/i18n';

export function getUiSettingDefaults() {
  const weekdays = moment.weekdays().slice();
  const [defaultWeekday] = weekdays;
  // We add the `en` key manually here, since that's not a real numeral locale, but the
  // default fallback in case the locale is not found.
  const numeralLanguageIds = ['en', ...numeralLanguages.map(function (numeralLanguage) {
    return numeralLanguage.id;
  })];

  // wrapped in provider so that a new instance is given to each app/test
  return {
    'buildNum': {
      readonly: true
    },
    'query:queryString:options': {
      name: i18n.translate('kbn.advancedSettings.query.queryStringOptionsTitle', {
        defaultMessage: 'Query string options',
      }),
      value: '{ "analyze_wildcard": true }',
      description:
        i18n.translate('kbn.advancedSettings.query.queryStringOptionsText', {
          defaultMessage: '{optionsLink} for the lucene query string parser',
          description: 'Part of composite text: kbn.advancedSettings.query.queryStringOptions.optionsLinkText + ' +
                       'kbn.advancedSettings.query.queryStringOptionsText',
          values: {
            optionsLink:
              '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html" target="_blank" rel="noopener noreferrer">' +
              i18n.translate('kbn.advancedSettings.query.queryStringOptions.optionsLinkText', {
                defaultMessage: 'Options',
              }) +
              '</a>',
          },
        }),
      type: 'json'
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
          'To disallow leading wildcards in basic lucene queries, use {queryStringOptionsPattern}',
        values: {
          queryStringOptionsPattern: 'query:queryString:options',
        },
      }),
    },
    'k7design': {
      name: i18n.translate('kbn.advancedSettings.k7designTitle', {
        defaultMessage: 'Use the new K7 UI design',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.k7designText', {
        defaultMessage:
          'When set, Kibana will use the new K7 design targeted for release in 7.0. At this time, not all features are implemented.',
      }),
    },
    'search:queryLanguage': {
      name: i18n.translate('kbn.advancedSettings.searchQueryLanguageTitle', {
        defaultMessage: 'Query language',
      }),
      value: 'lucene',
      description: i18n.translate('kbn.advancedSettings.searchQueryLanguageText', {
        defaultMessage:
          'Query language used by the query bar. Kuery is an experimental new language built specifically for Kibana.',
      }),
      type: 'select',
      options: ['lucene', 'kuery']
    },
    'sort:options': {
      name: i18n.translate('kbn.advancedSettings.sortOptionsTitle', {
        defaultMessage: 'Sort options',
      }),
      value: '{ "unmapped_type": "boolean" }',
      description: i18n.translate('kbn.advancedSettings.sortOptionsText', {
        defaultMessage: '{optionsLink} for the Elasticsearch sort parameter',
        description: 'Part of composite text: kbn.advancedSettings.sortOptions.optionsLinkText + ' +
                     'kbn.advancedSettings.sortOptionsText',
        values: {
          optionsLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.sortOptions.optionsLinkText', {
              defaultMessage: 'Options',
            }) +
            '</a>',
        },
      }),
      type: 'json'
    },
    'dateFormat': {
      name: i18n.translate('kbn.advancedSettings.dateFormatTitle', {
        defaultMessage: 'Date format',
      }),
      value: 'MMMM Do YYYY, HH:mm:ss.SSS',
      description: i18n.translate('kbn.advancedSettings.dateFormatText', {
        defaultMessage: 'When displaying a pretty formatted date, use this {formatLink}',
        description: 'Part of composite text: kbn.advancedSettings.dateFormatText + ' +
                     'kbn.advancedSettings.dateFormat.optionsLinkText',
        values: {
          formatLink:
            '<a href="http://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.dateFormat.optionsLinkText', {
              defaultMessage: 'format',
            }) +
            '</a>',
        },
      }),
    },
    'dateFormat:tz': {
      name: i18n.translate('kbn.advancedSettings.dateFormat.timezoneTitle', {
        defaultMessage: 'Timezone for date formatting',
      }),
      value: 'Browser',
      description: i18n.translate('kbn.advancedSettings.dateFormat.timezoneText', {
        defaultMessage:
          'Which timezone should be used. {defaultOption} will use the timezone detected by your browser.',
        values: {
          defaultOption: '"Browser"',
        },
      }),
      type: 'select',
      options: ['Browser', ...moment.tz.names()]
    },
    'dateFormat:scaled': {
      name: i18n.translate('kbn.advancedSettings.dateFormat.scaledTitle', {
        defaultMessage: 'Scaled date format',
      }),
      type: 'json',
      value:
`[
  ["", "HH:mm:ss.SSS"],
  ["PT1S", "HH:mm:ss"],
  ["PT1M", "HH:mm"],
  ["PT1H", "YYYY-MM-DD HH:mm"],
  ["P1DT", "YYYY-MM-DD"],
  ["P1YT", "YYYY"]
]`,
      description: i18n.translate('kbn.advancedSettings.dateFormat.scaledText', {
        defaultMessage:
          'Values that define the format used in situations where time-based ' +
          'data is rendered in order, and formatted timestamps should adapt to the ' +
          'interval between measurements. Keys are {intervalsLink}.',
        description:
          'Part of composite text: kbn.advancedSettings.dateFormat.scaledText + ' +
          'kbn.advancedSettings.dateFormat.scaled.intervalsLinkText',
        values: {
          intervalsLink:
            '<a href="http://en.wikipedia.org/wiki/ISO_8601#Time_intervals" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.dateFormat.scaled.intervalsLinkText', {
              defaultMessage: 'ISO8601 intervals',
            }) +
            '</a>',
        },
      }),
    },
    'dateFormat:dow': {
      name: i18n.translate('kbn.advancedSettings.dateFormat.dayOfWeekTitle', {
        defaultMessage: 'Day of week',
      }),
      value: defaultWeekday,
      description: i18n.translate('kbn.advancedSettings.dateFormat.dayOfWeekText', {
        defaultMessage: 'What day should weeks start on?',
      }),
      type: 'select',
      options: weekdays
    },
    'defaultIndex': {
      name: i18n.translate('kbn.advancedSettings.defaultIndexTitle', {
        defaultMessage: 'Default index',
      }),
      value: null,
      description: i18n.translate('kbn.advancedSettings.defaultIndexText', {
        defaultMessage: 'The index to access if no index is set',
      }),
    },
    'defaultColumns': {
      name: i18n.translate('kbn.advancedSettings.defaultColumnsTitle', {
        defaultMessage: 'Default columns',
      }),
      value: ['_source'],
      description: i18n.translate('kbn.advancedSettings.defaultColumnsText', {
        defaultMessage: 'Columns displayed by default in the Discovery tab',
      }),
      category: ['discover'],
    },
    'metaFields': {
      name: i18n.translate('kbn.advancedSettings.metaFieldsTitle', {
        defaultMessage: 'Meta fields',
      }),
      value: ['_source', '_id', '_type', '_index', '_score'],
      description: i18n.translate('kbn.advancedSettings.metaFieldsText', {
        defaultMessage:
          'Fields that exist outside of _source to merge into our document when displaying it',
      }),
    },
    'discover:sampleSize': {
      name: i18n.translate('kbn.advancedSettings.discover.sampleSizeTitle', {
        defaultMessage: 'Number of rows',
      }),
      value: 500,
      description: i18n.translate('kbn.advancedSettings.discover.sampleSizeText', {
        defaultMessage: 'The number of rows to show in the table',
      }),
      category: ['discover'],
    },
    'discover:aggs:terms:size': {
      name: i18n.translate('kbn.advancedSettings.discover.aggsTermsSizeTitle', {
        defaultMessage: 'Number of terms',
      }),
      value: 20,
      type: 'number',
      description: i18n.translate('kbn.advancedSettings.discover.aggsTermsSizeText', {
        defaultMessage:
          'Determines how many terms will be visualized when clicking the "visualize" ' +
          'button, in the field drop downs, in the discover sidebar.',
      }),
      category: ['discover'],
    },
    'discover:sort:defaultOrder': {
      name: i18n.translate('kbn.advancedSettings.discover.sortDefaultOrderTitle', {
        defaultMessage: 'Default sort direction',
      }),
      value: 'desc',
      options: ['desc', 'asc'],
      type: 'select',
      description: i18n.translate('kbn.advancedSettings.discover.sortDefaultOrderText', {
        defaultMessage:
          'Controls the default sort direction for time based index patterns in the Discover app.',
      }),
      category: ['discover'],
    },
    'doc_table:highlight': {
      name: i18n.translate('kbn.advancedSettings.docTableHighlightTitle', {
        defaultMessage: 'Highlight results',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.docTableHighlightText', {
        defaultMessage:
          'Highlight results in Discover and Saved Searches Dashboard. ' +
          'Highlighting makes requests slow when working on big documents.',
      }),
      category: ['discover'],
    },
    'doc_table:hideTimeColumn': {
      name: i18n.translate('kbn.advancedSettings.docTableHideTimeColumnTitle', {
        defaultMessage: 'Hide \'Time\' column',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.docTableHideTimeColumnText', {
        defaultMessage: 'Hide the \'Time\' column in Discover and in all Saved Searches on Dashboards.',
      }),
      category: ['discover'],
    },
    'courier:maxSegmentCount': {
      name: i18n.translate('kbn.advancedSettings.courier.maxSegmentCountTitle', {
        defaultMessage: 'Maximum segment count',
      }),
      value: 30,
      description: i18n.translate('kbn.advancedSettings.courier.maxSegmentCountText', {
        defaultMessage:
          'Requests in discover are split into segments to prevent massive requests from being sent to elasticsearch. ' +
          'This setting attempts to prevent the list of segments from getting too long, ' +
          'which might cause requests to take much longer to process.',
      }),
      category: ['search'],
    },
    'courier:ignoreFilterIfFieldNotInIndex': {
      name: i18n.translate('kbn.advancedSettings.courier.ignoreFilterTitle', {
        defaultMessage: 'Ignore filter(s)',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.courier.ignoreFilterText', {
        defaultMessage:
          'This configuration enhances support for dashboards containing visualizations accessing dissimilar indexes. ' +
          'When set to false, all filters are applied to all visualizations. ' +
          'When set to true, filter(s) will be ignored for a visualization ' +
          `when the visualization's index does not contain the filtering field.`,
      }),
      category: ['search'],
    },
    'courier:setRequestPreference': {
      name: i18n.translate('kbn.advancedSettings.courier.requestPreferenceTitle', {
        defaultMessage: 'Request preference',
      }),
      value: 'sessionId',
      options: ['sessionId', 'custom', 'none'],
      type: 'select',
      description: i18n.translate('kbn.advancedSettings.courier.requestPreferenceText', {
        defaultMessage:
          `Allows you to set which shards handle your search requests.
          <ul>
            <li><strong>sessionId:</strong> restricts operations to execute all search requests on the same shards.
              This has the benefit of reusing shard caches across requests.</li>
            <li><strong>custom:</strong> allows you to define a your own preference.
              Use <strong>courier:customRequestPreference</strong> to customize your preference value.</li>
            <li><strong>none:</strong> means do not set a preference.
              This might provide better performance because requests can be spread across all shard copies.
              However, results might be inconsistent because different shards might be in different refresh states.</li>
          </ul>`,
      }),
      category: ['search'],
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
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-preference.html" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.courier.customRequestPreference.requestPreferenceLinkText', {
              defaultMessage: 'Request Preference',
            }) +
            '</a>',
        },
      }),
      category: ['search'],
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
          maxRequestsLink:
            `<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html"
            target="_blank" rel="noopener noreferrer" >max_concurrent_shard_requests</a>`
        },
      }),
      category: ['search'],
    },
    'search:includeFrozen': {
      name: 'Search in frozen indices',
      description: `Will include <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/frozen-indices.html"
        target="_blank" rel="noopener noreferrer">frozen indices</a> in results if enabled. Searching through frozen indices
        might increase the search time.`,
      value: false,
      category: ['search'],
    },
    'fields:popularLimit': {
      name: i18n.translate('kbn.advancedSettings.fieldsPopularLimitTitle', {
        defaultMessage: 'Popular fields limit',
      }),
      value: 10,
      description: i18n.translate('kbn.advancedSettings.fieldsPopularLimitText', {
        defaultMessage: 'The top N most popular fields to show',
      }),
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
    },
    'visualize:enableLabs': {
      name: i18n.translate('kbn.advancedSettings.visualizeEnableLabsTitle', {
        defaultMessage: 'Enable experimental visualizations',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.visualizeEnableLabsText', {
        defaultMessage:
          `Allows users to create, view, and edit experimental visualizations. If disabled,
          only visualizations that are considered production-ready are available to the user.`,
      }),
      category: ['visualization'],
    },
    'visualization:tileMap:maxPrecision': {
      name: i18n.translate('kbn.advancedSettings.visualization.tileMap.maxPrecisionTitle', {
        defaultMessage: 'Maximum tile map precision',
      }),
      value: 7,
      description: i18n.translate('kbn.advancedSettings.visualization.tileMap.maxPrecisionText', {
        defaultMessage:
          'The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, 12 is the max. {cellDimensionsLink}',
        description:
          'Part of composite text: kbn.advancedSettings.visualization.tileMap.maxPrecisionText + ' +
          'kbn.advancedSettings.visualization.tileMap.maxPrecision.cellDimensionsLinkText',
        values: {
          cellDimensionsLink:
            `<a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator"
            target="_blank" rel="noopener noreferrer">` +
            i18n.translate('kbn.advancedSettings.visualization.tileMap.maxPrecision.cellDimensionsLinkText', {
              defaultMessage: 'Explanation of cell dimensions',
            }) +
            '</a>',
        },
      }),
      category: ['visualization'],
    },
    'visualization:tileMap:WMSdefaults': {
      name: i18n.translate('kbn.advancedSettings.visualization.tileMap.wmsDefaultsTitle', {
        defaultMessage: 'Default WMS properties',
      }),
      value: JSON.stringify({
        enabled: false,
        url: undefined,
        options: {
          version: undefined,
          layers: undefined,
          format: 'image/png',
          transparent: true,
          attribution: undefined,
          styles: undefined,
        }
      }, null, 2),
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.visualization.tileMap.wmsDefaultsText', {
        defaultMessage:
          'Default {propertiesLink} for the WMS map server support in the coordinate map',
        description:
          'Part of composite text: kbn.advancedSettings.visualization.tileMap.wmsDefaultsText + ' +
          'kbn.advancedSettings.visualization.tileMap.wmsDefaults.propertiesLinkText',
        values: {
          propertiesLink:
            '<a href="http://leafletjs.com/reference.html#tilelayer-wms" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.visualization.tileMap.wmsDefaults.propertiesLinkText', {
              defaultMessage: 'properties',
            }) +
            '</a>',
        },
      }),
      category: ['visualization'],
    },
    'visualization:regionmap:showWarnings': {
      name: i18n.translate('kbn.advancedSettings.visualization.showRegionMapWarningsTitle', {
        defaultMessage: 'Show region map warning',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.visualization.showRegionMapWarningsText', {
        defaultMessage:
          'Whether the region map shows a warning when terms cannot be joined to a shape on the map.',
      }),
      category: ['visualization'],
    },
    'visualization:colorMapping': {
      name: i18n.translate('kbn.advancedSettings.visualization.colorMappingTitle', {
        defaultMessage: 'Color mapping',
      }),
      value: JSON.stringify({
        Count: '#00A69B'
      }),
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.visualization.colorMappingText', {
        defaultMessage: 'Maps values to specified colors within visualizations',
      }),
      category: ['visualization'],
    },
    'visualization:loadingDelay': {
      name: i18n.translate('kbn.advancedSettings.visualization.loadingDelayTitle', {
        defaultMessage: 'Loading delay',
      }),
      value: '2s',
      description: i18n.translate('kbn.advancedSettings.visualization.loadingDelayText', {
        defaultMessage: 'Time to wait before dimming visualizations during query',
      }),
      category: ['visualization'],
    },
    'visualization:dimmingOpacity': {
      name: i18n.translate('kbn.advancedSettings.visualization.dimmingOpacityTitle', {
        defaultMessage: 'Dimming opacity',
      }),
      value: 0.5,
      type: 'number',
      description: i18n.translate('kbn.advancedSettings.visualization.dimmingOpacityText', {
        defaultMessage:
          'The opacity of the chart items that are dimmed when highlighting another element of the chart. ' +
          'The lower this number, the more the highlighted element will stand out. ' +
          'This must be a number between 0 and 1.',
      }),
      category: ['visualization'],
    },
    'csv:separator': {
      name: i18n.translate('kbn.advancedSettings.csv.separatorTitle', {
        defaultMessage: 'CSV separator',
      }),
      value: ',',
      description: i18n.translate('kbn.advancedSettings.csv.separatorText', {
        defaultMessage: 'Separate exported values with this string',
      }),
    },
    'csv:quoteValues': {
      name: i18n.translate('kbn.advancedSettings.csv.quoteValuesTitle', {
        defaultMessage: 'Quote CSV values',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.csv.quoteValuesText', {
        defaultMessage: 'Should values be quoted in csv exports?',
      }),
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
    },
    'shortDots:enable': {
      name: i18n.translate('kbn.advancedSettings.shortenFieldsTitle', {
        defaultMessage: 'Shorten fields',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.shortenFieldsText', {
        defaultMessage: 'Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz',
      }),
    },
    'truncate:maxHeight': {
      name: i18n.translate('kbn.advancedSettings.maxCellHeightTitle', {
        defaultMessage: 'Maximum table cell height',
      }),
      value: 115,
      description: i18n.translate('kbn.advancedSettings.maxCellHeightText', {
        defaultMessage:
          'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation',
      }),
    },
    'indexPattern:fieldMapping:lookBack': {
      name: i18n.translate('kbn.advancedSettings.indexPattern.recentMatchingTitle', {
        defaultMessage: 'Recent matching patterns',
      }),
      value: 5,
      description: i18n.translate('kbn.advancedSettings.indexPattern.recentMatchingText', {
        defaultMessage:
          'For index patterns containing timestamps in their names, look for this many recent matching ' +
          'patterns from which to query the field mapping',
      }),
    },
    'indexPatterns:warnAboutUnsupportedTimePatterns': {
      name: i18n.translate('kbn.advancedSettings.indexPattern.unsupportedTimePatternWarningTitle', {
        defaultMessage: 'Time pattern warning',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.indexPattern.unsupportedTimePatternWarningText', {
        defaultMessage:
          'When an index pattern is using the now unsupported "time pattern" format, a warning will ' +
          'be displayed once per session that is using this pattern. Set this to false to disable that warning.',
      }),
    },
    'format:defaultTypeMap': {
      name: i18n.translate('kbn.advancedSettings.format.defaultTypeMapTitle', {
        defaultMessage: 'Field type format name',
      }),
      value:
`{
  "ip": { "id": "ip", "params": {} },
  "date": { "id": "date", "params": {} },
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
    },
    'format:number:defaultPattern': {
      name: i18n.translate('kbn.advancedSettings.format.numberFormatTitle', {
        defaultMessage: 'Number format',
      }),
      value: '0,0.[000]',
      type: 'string',
      description: i18n.translate('kbn.advancedSettings.format.numberFormatText', {
        defaultMessage:
          'Default {numeralFormatLink} for the "number" format',
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
    },
    'format:bytes:defaultPattern': {
      name: i18n.translate('kbn.advancedSettings.format.bytesFormatTitle', {
        defaultMessage: 'Bytes format',
      }),
      value: '0,0.[000]b',
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
    },
    'format:number:defaultLocale': {
      name: i18n.translate('kbn.advancedSettings.format.formattingLocaleTitle', {
        defaultMessage: 'Formatting locale',
      }),
      value: 'en',
      type: 'select',
      options: numeralLanguageIds,
      description: i18n.translate('kbn.advancedSettings.format.formattingLocaleText', {
        defaultMessage:
          `{numeralLanguageLink} locale`,
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
    },
    'savedObjects:perPage': {
      name: i18n.translate('kbn.advancedSettings.savedObjects.perPageTitle', {
        defaultMessage: 'Objects per page',
      }),
      value: 20,
      type: 'number',
      description: i18n.translate('kbn.advancedSettings.savedObjects.perPageText', {
        defaultMessage: 'Number of objects to show per page in the load dialog',
      }),
    },
    'savedObjects:listingLimit': {
      name: i18n.translate('kbn.advancedSettings.savedObjects.listingLimitTitle', {
        defaultMessage: 'Objects listing limit',
      }),
      type: 'number',
      value: 1000,
      description: i18n.translate('kbn.advancedSettings.savedObjects.listingLimitText', {
        defaultMessage: 'Number of objects to fetch for the listing pages',
      }),
    },
    'timepicker:timeDefaults': {
      name: i18n.translate('kbn.advancedSettings.timepicker.timeDefaultsTitle', {
        defaultMessage: 'Time picker defaults',
      }),
      value:
`{
  "from": "now-15m",
  "to": "now",
  "mode": "quick"
}`,
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.timepicker.timeDefaultsText', {
        defaultMessage: 'The timefilter selection to use when Kibana is started without one',
      }),
    },
    'timepicker:refreshIntervalDefaults': {
      name: i18n.translate('kbn.advancedSettings.timepicker.refreshIntervalDefaultsTitle', {
        defaultMessage: 'Time picker refresh interval',
      }),
      value:
`{
  "pause": false,
  "value": 0
}`,
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.timepicker.refreshIntervalDefaultsText', {
        defaultMessage: `The timefilter's default refresh interval`,
      }),
    },
    'timepicker:quickRanges': {
      name: i18n.translate('kbn.advancedSettings.timepicker.quickRangesTitle', {
        defaultMessage: 'Time picker quick ranges',
      }),
      value: JSON.stringify([
        { from: 'now/d',    to: 'now/d',    display: 'Today',                 section: 0 },
        { from: 'now/w',    to: 'now/w',    display: 'This week',             section: 0 },
        { from: 'now/M',    to: 'now/M',    display: 'This month',            section: 0 },
        { from: 'now/y',    to: 'now/y',    display: 'This year',             section: 0 },
        { from: 'now/d',    to: 'now',      display: 'Today so far',          section: 0 },
        { from: 'now/w',    to: 'now',      display: 'Week to date',          section: 0 },
        { from: 'now/M',    to: 'now',      display: 'Month to date',         section: 0 },
        { from: 'now/y',    to: 'now',      display: 'Year to date',          section: 0 },

        { from: 'now-15m',  to: 'now',      display: 'Last 15 minutes',       section: 1 },
        { from: 'now-30m',  to: 'now',      display: 'Last 30 minutes',       section: 1 },
        { from: 'now-1h',   to: 'now',      display: 'Last 1 hour',           section: 1 },
        { from: 'now-4h',   to: 'now',      display: 'Last 4 hours',          section: 1 },
        { from: 'now-12h',  to: 'now',      display: 'Last 12 hours',         section: 1 },
        { from: 'now-24h',  to: 'now',      display: 'Last 24 hours',         section: 1 },
        { from: 'now-7d',   to: 'now',      display: 'Last 7 days',           section: 1 },

        { from: 'now-30d',  to: 'now',      display: 'Last 30 days',          section: 2 },
        { from: 'now-60d',  to: 'now',      display: 'Last 60 days',          section: 2 },
        { from: 'now-90d',  to: 'now',      display: 'Last 90 days',          section: 2 },
        { from: 'now-6M',   to: 'now',      display: 'Last 6 months',         section: 2 },
        { from: 'now-1y',   to: 'now',      display: 'Last 1 year',           section: 2 },
        { from: 'now-2y',   to: 'now',      display: 'Last 2 years',          section: 2 },
        { from: 'now-5y',   to: 'now',      display: 'Last 5 years',          section: 2 },

      ], null, 2),
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.timepicker.quickRangesText', {
        defaultMessage:
          'The list of ranges to show in the Quick section of the time picker. This should be an array of objects, ' +
          'with each object containing "from", "to" (see {acceptedFormatsLink}), ' +
          '"display" (the title to be displayed), and "section" (which column to put the option in).',
        description:
          'Part of composite text: kbn.advancedSettings.timepicker.quickRangesText + ' +
          'kbn.advancedSettings.timepicker.quickRanges.acceptedFormatsLinkText',
        values: {
          acceptedFormatsLink:
            `<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math"
            target="_blank" rel="noopener noreferrer">` +
            i18n.translate('kbn.advancedSettings.timepicker.quickRanges.acceptedFormatsLinkText', {
              defaultMessage: 'accepted formats',
            }) +
            '</a>',
        },
      }),
    },
    'theme:darkMode': {
      name: i18n.translate('kbn.advancedSettings.darkModeTitle', {
        defaultMessage: 'Dark mode',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.darkModeText', {
        defaultMessage: `Enable a dark mode for the Kibana UI. A page refresh is required for the setting to be applied.`,
      }),
    },
    'filters:pinnedByDefault': {
      name: i18n.translate('kbn.advancedSettings.pinFiltersTitle', {
        defaultMessage: 'Pin filters by default',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.pinFiltersText', {
        defaultMessage: 'Whether the filters should have a global state (be pinned) by default',
      }),
    },
    'filterEditor:suggestValues': {
      name: i18n.translate('kbn.advancedSettings.suggestFilterValuesTitle', {
        defaultMessage: 'Filter editor suggest values',
        description: '"Filter editor" refers to the UI you create filters in.',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.suggestFilterValuesText', {
        defaultMessage: 'Set this property to false to prevent the filter editor from suggesting values for fields.',
      }),
    },
    'notifications:banner': {
      name: i18n.translate('kbn.advancedSettings.notifications.bannerTitle', {
        defaultMessage: 'Custom banner notification',
      }),
      value: '',
      type: 'markdown',
      description: i18n.translate('kbn.advancedSettings.notifications.bannerText', {
        defaultMessage: 'A custom banner intended for temporary notices to all users. {markdownLink}.',
        description:
          'Part of composite text: kbn.advancedSettings.notifications.bannerText + ' +
          'kbn.advancedSettings.notifications.banner.markdownLinkText',
        values: {
          markdownLink:
            `<a href="https://help.github.com/articles/basic-writing-and-formatting-syntax/"
            target="_blank" rel="noopener noreferrer">` +
            i18n.translate('kbn.advancedSettings.notifications.banner.markdownLinkText', {
              defaultMessage: 'Markdown supported',
            }) +
            '</a>',
        },
      }),
      category: ['notifications'],
    },
    'notifications:lifetime:banner': {
      name: i18n.translate('kbn.advancedSettings.notifications.bannerLifetimeTitle', {
        defaultMessage: 'Banner notification lifetime',
      }),
      value: 3000000,
      description: i18n.translate('kbn.advancedSettings.notifications.bannerLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a banner notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable the countdown.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:error': {
      name: i18n.translate('kbn.advancedSettings.notifications.errorLifetimeTitle', {
        defaultMessage: 'Error notification lifetime',
      }),
      value: 300000,
      description: i18n.translate('kbn.advancedSettings.notifications.errorLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an error notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        }
      }),
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:warning': {
      name: i18n.translate('kbn.advancedSettings.notifications.warningLifetimeTitle', {
        defaultMessage: 'Warning notification lifetime',
      }),
      value: 10000,
      description: i18n.translate('kbn.advancedSettings.notifications.warningLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a warning notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:info': {
      name: i18n.translate('kbn.advancedSettings.notifications.infoLifetimeTitle', {
        defaultMessage: 'Info notification lifetime',
      }),
      value: 5000,
      description: i18n.translate('kbn.advancedSettings.notifications.infoLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an information notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'metrics:max_buckets': {
      name: i18n.translate('kbn.advancedSettings.maxBucketsTitle', {
        defaultMessage: 'Maximum buckets',
      }),
      value: 2000,
      description: i18n.translate('kbn.advancedSettings.maxBucketsText', {
        defaultMessage: 'The maximum number of buckets a single datasource can return',
      }),
    },
    'state:storeInSessionStorage': {
      name: i18n.translate('kbn.advancedSettings.storeUrlTitle', {
        defaultMessage: 'Store URLs in session storage',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.storeUrlText', {
        defaultMessage:
          'The URL can sometimes grow to be too large for some browsers to handle. ' +
          'To counter-act this we are testing if storing parts of the URL in session storage could help. ' +
          'Please let us know how it goes!'
      }),
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
    },
    'context:defaultSize': {
      name: i18n.translate('kbn.advancedSettings.context.defaultSizeTitle', {
        defaultMessage: 'Context size',
      }),
      value: 5,
      description: i18n.translate('kbn.advancedSettings.context.defaultSizeText', {
        defaultMessage: 'The number of surrounding entries to show in the context view',
      }),
      category: ['discover'],
    },
    'context:step': {
      name: i18n.translate('kbn.advancedSettings.context.sizeStepTitle', {
        defaultMessage: 'Context size step',
      }),
      value: 5,
      description: i18n.translate('kbn.advancedSettings.context.sizeStepText', {
        defaultMessage: 'The step size to increment or decrement the context size by',
      }),
      category: ['discover'],
    },
    'context:tieBreakerFields': {
      name: i18n.translate('kbn.advancedSettings.context.tieBreakerFieldsTitle', {
        defaultMessage: 'Tie breaker fields',
      }),
      value: ['_doc'],
      description: i18n.translate('kbn.advancedSettings.context.tieBreakerFieldsText', {
        defaultMessage:
          'A comma-separated list of fields to use for tie-breaking between documents that have the same timestamp value. ' +
          'From this list the first field that is present and sortable in the current index pattern is used.',
      }),
      category: ['discover'],
    },
    'accessibility:disableAnimations': {
      name: i18n.translate('kbn.advancedSettings.disableAnimationsTitle', {
        defaultMessage: 'Disable Animations',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.disableAnimationsText', {
        defaultMessage: 'Turn off all unnecessary animations in the Kibana UI. Refresh the page to apply the changes.',
      }),
      category: ['accessibility'],
    },
    'rollups:enableIndexPatterns': {
      name: i18n.translate('kbn.advancedSettings.rollupIndexPatternsTitle', {
        defaultMessage: 'Enable rollup index patterns',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.rollupIndexPatternsText', {
        defaultMessage:
          'Enable the creation of index patterns which capture rollup indices, which in turn enable ' +
          'visualizations based on rollup data. Refresh the page to apply the changes.',
      }),
      category: ['rollups'],
    },
  };
}
