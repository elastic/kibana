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
import _ from 'lodash';

function _toi18n(defaultString, id, component = '') {
  id = id | _.camelCase(defaultString);
  return i18n.translate(`kbn.advancedSettings.${component}.${id}`, {
    defaultMessage: defaultString,
  });
}

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
      name: _toi18n('Query string options', 'queryStringOptionsTitle', 'query'),
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
      name: _toi18n('Allow leading wildcards in query', 'allowWildcardsTitle', 'query'),
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
      name: _toi18n('Query language', 'searchQueryLanguageTitle'),
      value: 'lucene',
      description: _toi18n('Query language used by the query bar. Kuery is an experimental new language built specifically for Kibana.',
        'searchQueryLanguageText'),
      type: 'select',
      options: ['lucene', 'kuery']
    },
    'sort:options': {
      name: _toi18n('Sort options', 'sortOptionsTitle'),
      value: '{ "unmapped_type": "boolean" }',
      description: i18n.translate('kbn.advancedSettings.sortOptionsText', {
        defaultMessage: '{optionsLink} for the Elasticsearch sort parameter',
        description: 'Part of composite text: kbn.advancedSettings.sortOptions.optionsLinkText + ' +
                     'kbn.advancedSettings.sortOptionsText',
        values: {
          optionsLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html" target="_blank" rel="noopener noreferrer">' +
            _toi18n('Options', 'optionsLinkText', 'sortOptions') +
            '</a>',
        },
      }),
      type: 'json'
    },
    'dateFormat': {
      name: _toi18n('Date format', 'dateFormatTitle'),
      value: 'MMMM Do YYYY, HH:mm:ss.SSS',
      description: i18n.translate('kbn.advancedSettings.dateFormatText', {
        defaultMessage: 'When displaying a pretty formatted date, use this {formatLink}',
        description: 'Part of composite text: kbn.advancedSettings.dateFormatText + ' +
                     'kbn.advancedSettings.dateFormat.optionsLinkText',
        values: {
          formatLink:
            '<a href="http://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">' +
            _toi18n('format', 'optionsLinkText', 'dateFormat') +
            '</a>',
        },
      }),
    },
    'dateFormat:tz': {
      name: _toi18n('Timezone for date formatting', 'timezoneTitle', 'dateFormat'),
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
      name: _toi18n('Scaled date format', 'scaledTitle', 'dateFormat'),
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
      name: _toi18n('Day of week', 'dayOfWeekTitle', 'dateFormat'),
      value: defaultWeekday,
      description: _toi18n('What day should weeks start on?', 'dayOfWeekText', 'dateFormat'),
      type: 'select',
      options: weekdays
    },
    'defaultIndex': {
      name: _toi18n('Default index', 'defaultIndexTitle'),
      value: null,
      description: _toi18n('The index to access if no index is set', 'defaultIndexText'),
    },
    'defaultColumns': {
      name: _toi18n('Default columns', 'defaultColumnsTitle'),
      value: ['_source'],
      description: _toi18n('Columns displayed by default in the Discovery tab', 'defaultColumnsText'),
      category: ['discover'],
    },
    'metaFields': {
      name: _toi18n('Meta fields', 'metaFieldsTitle'),
      value: ['_source', '_id', '_type', '_index', '_score'],
      description: _toi18n('Fields that exist outside of _source to merge into our document when displaying it', 'metaFieldsText'),
    },
    'discover:sampleSize': {
      name: _toi18n('Number of rows', 'sampleSizeTitle', 'discover'),
      value: 500,
      description: _toi18n('The number of rows to show in the table', 'sampleSizeText', 'discover'),
      category: ['discover'],
    },
    'discover:aggs:terms:size': {
      name: _toi18n('Number of terms', 'aggsTermsSizeTitle', 'discover'),
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
      name: _toi18n('Default sort direction', 'sortDefaultOrderTitle', 'discover'),
      value: 'desc',
      options: ['desc', 'asc'],
      type: 'select',
      description: _toi18n('Controls the default sort direction for time based index patterns in the Discover app.',
        'sortDefaultOrderText', 'discover'),
      category: ['discover'],
    },
    'doc_table:highlight': {
      name: _toi18n('Highlight results', 'docTableHighlightTitle'),
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
      name: _toi18n('Maximum segment count', 'maxSegmentCountTitle', 'courier'),
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
      name: _toi18n('Request preference', 'requestPreferenceTitle', 'courier'),
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
      name: _toi18n('Custom request preference', 'customRequestPreferenceTitle', 'courier'),
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
      name: _toi18n('Max Concurrent Shard Requests', 'maxRequestsTitle', 'courier'),
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
      name: _toi18n('Popular fields limit', 'fieldsPopularLimitTitle'),
      value: 10,
      description: _toi18n('The top N most popular fields to show', 'fieldsPopularLimitText'),
    },
    'histogram:barTarget': {
      name: _toi18n('Target bars', 'barTargetTitle', 'histogram'),
      value: 50,
      description: _toi18n('Attempt to generate around this many bars when using "auto" interval in date histograms',
        'barTargetText', 'histogram'),
    },
    'histogram:maxBars': {
      name: _toi18n('Maximum bars', 'maxBarsTitle', 'histogram'),
      value: 100,
      description: _toi18n('Never show more than this many bars in date histograms, scale values if needed', 'maxBarsText', 'histogram'),
    },
    'visualize:enableLabs': {
      name: _toi18n('Enable experimental visualizations', 'visualizeEnableLabsTitle'),
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
      name: _toi18n('Show region map warning', 'showRegionMapWarningsTitle', 'visualization'),
      value: true,
      description: _toi18n('Whether the region map shows a warning when terms cannot be joined to a shape on the map.',
        'showRegionMapWarningsText', 'visualization'),
      category: ['visualization'],
    },
    'visualization:colorMapping': {
      name: _toi18n('Color mapping', 'colorMappingTitle', 'visualization'),
      value: JSON.stringify({
        Count: '#00A69B'
      }),
      type: 'json',
      description: _toi18n('Maps values to specified colors within visualizations', 'colorMappingText', 'visualization'),
      category: ['visualization'],
    },
    'visualization:loadingDelay': {
      name: _toi18n('Loading delay', 'loadingDelayTitle', 'visualization'),
      value: '2s',
      description: _toi18n('Time to wait before dimming visualizations during query', 'loadingDelayText', 'visualization'),
      category: ['visualization'],
    },
    'visualization:dimmingOpacity': {
      name: _toi18n('Dimming opacity', 'dimmingOpacityTitle', 'visualization'),
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
      name: _toi18n('CSV separator', 'separatorTitle', 'csv'),
      value: ',',
      description: _toi18n('Separate exported values with this string', 'separatorText', 'csv'),
    },
    'csv:quoteValues': {
      name: _toi18n('Quote CSV values', 'quoteValuesTitle', 'csv'),
      value: true,
      description: _toi18n('Should values be quoted in csv exports?', 'quoteValuesText', 'csv'),
    },
    'history:limit': {
      name: _toi18n('History limit', 'historyLimitTitle'),
      value: 10,
      description: i18n.translate('kbn.advancedSettings.historyLimitText', {
        defaultMessage:
          'In fields that have history (e.g. query inputs), show this many recent values',
      }),
    },
    'shortDots:enable': {
      name: _toi18n('Shorten fields', 'shortenFieldsTitle'),
      value: false,
      description: _toi18n('Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz', 'shortenFieldsText'),
    },
    'truncate:maxHeight': {
      name: _toi18n('Maximum table cell height', 'maxCellHeightTitle'),
      value: 115,
      description: i18n.translate('kbn.advancedSettings.maxCellHeightText', {
        defaultMessage:
          'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation',
      }),
    },
    'indexPattern:fieldMapping:lookBack': {
      name: _toi18n('Recent matching patterns', 'recentMatchingTitle', 'indexPattern'),
      value: 5,
      description: i18n.translate('kbn.advancedSettings.indexPattern.recentMatchingText', {
        defaultMessage:
          'For index patterns containing timestamps in their names, look for this many recent matching ' +
          'patterns from which to query the field mapping',
      }),
    },
    'indexPatterns:warnAboutUnsupportedTimePatterns': {
      name: _toi18n('Time pattern warning', 'unsupportedTimePatternWarningTitle', 'indexPattern'),
      value: false,
      description: i18n.translate('kbn.advancedSettings.indexPattern.unsupportedTimePatternWarningText', {
        defaultMessage:
          'When an index pattern is using the now unsupported "time pattern" format, a warning will ' +
          'be displayed once per session that is using this pattern. Set this to false to disable that warning.',
      }),
    },
    'format:defaultTypeMap': {
      name: _toi18n('Field type format name', 'defaultTypeMapTitle', 'format'),
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
      name: _toi18n('Number format', 'numberFormatTitle', 'format'),
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
      name: _toi18n('Bytes format', 'bytesFormatTitle', 'format'),
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
      name: _toi18n('Percent format', 'percentFormatTitle', 'format'),
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
      name: _toi18n('Currency format', 'currencyFormatTitle', 'format'),
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
      name: _toi18n('Formatting locale', 'formattingLocaleTitle', 'format'),
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
      name: _toi18n('Objects per page', 'perPageTitle', 'savedObjects'),
      value: 20,
      type: 'number',
      description: _toi18n('Number of objects to show per page in the load dialog', 'perPageText', 'savedObjects'),
    },
    'savedObjects:listingLimit': {
      name: _toi18n('Objects listing limit', 'listingLimitTitle', 'savedObjects'),
      type: 'number',
      value: 1000,
      description: _toi18n('Number of objects to fetch for the listing pages', 'listingLimitText', 'savedObjects'),
    },
    'timepicker:timeDefaults': {
      name: _toi18n('Time picker defaults', 'timeDefaultsTitle', 'timepicker'),
      value:
`{
  "from": "now-15m",
  "to": "now",
  "mode": "quick"
}`,
      type: 'json',
      description: _toi18n('The timefilter selection to use when Kibana is started without one', 'timeDefaultsText', 'timepicker'),
    },
    'timepicker:refreshIntervalDefaults': {
      name: _toi18n('Time picker refresh interval', 'refreshIntervalDefaultsTitle', 'timepicker'),
      value:
`{
  "pause": false,
  "value": 0
}`,
      type: 'json',
      description: _toi18n('timepicker', 'refreshIntervalDefaultsText', `The timefilter's default refresh interval`),
    },
    'timepicker:quickRanges': {
      name: _toi18n('Time picker quick ranges', 'quickRangesTitle', 'timepicker'),
      value: JSON.stringify([
        { from: 'now/d',    to: 'now/d',    display: _toi18n('Today', '', 'timepicker'),                 section: 0 },
        { from: 'now/w',    to: 'now/w',    display: _toi18n('This week', '', 'timepicker'),             section: 0 },
        { from: 'now/M',    to: 'now/M',    display: _toi18n('This month', '', 'timepicker'),            section: 0 },
        { from: 'now/y',    to: 'now/y',    display: _toi18n('This year', '', 'timepicker'),             section: 0 },
        { from: 'now/d',    to: 'now',      display: _toi18n('Today so far', '', 'timepicker'),          section: 0 },
        { from: 'now/w',    to: 'now',      display: _toi18n('Week to date', '', 'timepicker'),          section: 0 },
        { from: 'now/M',    to: 'now',      display: _toi18n('Month to date', '', 'timepicker'),         section: 0 },
        { from: 'now/y',    to: 'now',      display: _toi18n('Year to date', '', 'timepicker'),          section: 0 },

        { from: 'now-15m',  to: 'now',      display: _toi18n('Last 15 minutes', '', 'timepicker'),       section: 1 },
        { from: 'now-30m',  to: 'now',      display: _toi18n('Last 30 minutes', '', 'timepicker'),       section: 1 },
        { from: 'now-1h',   to: 'now',      display: _toi18n('Last 1 hour', '', 'timepicker'),           section: 1 },
        { from: 'now-4h',   to: 'now',      display: _toi18n('Last 4 hours', '', 'timepicker'),          section: 1 },
        { from: 'now-12h',  to: 'now',      display: _toi18n('Last 12 hours', '', 'timepicker'),         section: 1 },
        { from: 'now-24h',  to: 'now',      display: _toi18n('Last 24 hours', '', 'timepicker'),         section: 1 },
        { from: 'now-7d',   to: 'now',      display: _toi18n('Last 7 days', '', 'timepicker'),           section: 1 },

        { from: 'now-30d',  to: 'now',      display: _toi18n('Last 30 days', '', 'timepicker'),          section: 2 },
        { from: 'now-60d',  to: 'now',      display: _toi18n('Last 60 days', '', 'timepicker'),          section: 2 },
        { from: 'now-90d',  to: 'now',      display: _toi18n('Last 90 days', '', 'timepicker'),          section: 2 },
        { from: 'now-6M',   to: 'now',      display: _toi18n('Last 6 months', '', 'timepicker'),         section: 2 },
        { from: 'now-1y',   to: 'now',      display: _toi18n('Last 1 year', '', 'timepicker'),           section: 2 },
        { from: 'now-2y',   to: 'now',      display: _toi18n('Last 2 years', '', 'timepicker'),          section: 2 },
        { from: 'now-5y',   to: 'now',      display: _toi18n('Last 5 years', '', 'timepicker'),          section: 2 },

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
      name: _toi18n('Dark mode', 'darkModeTitle'),
      value: false,
      description: _toi18n(`Enable a dark mode for the Kibana UI. A page refresh is required for the setting to be applied.`,
        'darkModeText')
    },
    'filters:pinnedByDefault': {
      name: _toi18n('Pin filters by default', 'pinFiltersTitle'),
      value: false,
      description: _toi18n('Whether the filters should have a global state (be pinned) by default', 'pinFiltersText'),
    },
    'filterEditor:suggestValues': {
      name: i18n.translate('kbn.advancedSettings.suggestFilterValuesTitle', {
        defaultMessage: 'Filter editor suggest values',
        description: '"Filter editor" refers to the UI you create filters in.',
      }),
      value: true,
      description: _toi18n('Set this property to false to prevent the filter editor from suggesting values for fields.',
        'suggestFilterValuesText'),
    },
    'notifications:banner': {
      name: _toi18n('Custom banner notification', 'bannerTitle', 'notifications'),
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
      name: _toi18n('Banner notification lifetime', 'bannerLifetimeTitle', 'notifications'),
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
      name: _toi18n('Error notification lifetime', 'errorLifetimeTitle', 'notifications'),
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
      name: _toi18n('Warning notification lifetime', 'warningLifetimeTitle', 'notifications'),
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
      name: _toi18n('Info notification lifetime', 'infoLifetimeTitle', 'notifications'),
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
      name: _toi18n('Maximum buckets', 'maxBucketsTitle'),
      value: 2000,
      description: _toi18n('The maximum number of buckets a single datasource can return', 'maxBucketsText'),
    },
    'state:storeInSessionStorage': {
      name: _toi18n('Store URLs in session storage', 'storeUrlTitle'),
      value: false,
      description: _toi18n(
        'The URL can sometimes grow to be too large for some browsers to handle. ' +
        'To counter-act this we are testing if storing parts of the URL in session storage could help. ' +
        'Please let us know how it goes!',
        'storeUrlText'
      ),
    },
    'indexPattern:placeholder': {
      name: _toi18n('Index pattern placeholder', 'indexPatternPlaceholderTitle'),
      value: '',
      description: _toi18n('The placeholder for the "Index pattern name" field in "Management > Index Patterns > Create Index Pattern".',
        'indexPatternPlaceholderText'),
    },
    'context:defaultSize': {
      name: _toi18n('Context size', 'defaultSizeTitle', 'context'),
      value: 5,
      description: _toi18n('The number of surrounding entries to show in the context view', 'defaultSizeText', 'context'),
      category: ['discover'],
    },
    'context:step': {
      name: _toi18n('Context size step', 'sizeStepTitle', 'context'),
      value: 5,
      description: _toi18n('The step size to increment or decrement the context size by', 'sizeStepText', 'context'),
      category: ['discover'],
    },
    'context:tieBreakerFields': {
      name: _toi18n('Tie breaker fields', 'tieBreakerFieldsTitle', 'context'),
      value: ['_doc'],
      description: _toi18n(
        'A comma-separated list of fields to use for tie-breaking between documents that have the same timestamp value. ' +
        'From this list the first field that is present and sortable in the current index pattern is used.',
        'tieBreakerFieldsText'
      ),
      category: ['discover'],
    },
    'accessibility:disableAnimations': {
      name: _toi18n('Disable Animations', 'disableAnimationsTitle'),
      value: false,
      description: _toi18n('Turn off all unnecessary animations in the Kibana UI. Refresh the page to apply the changes.',
        'disableAnimationsText'),
      category: ['accessibility'],
    },
    'rollups:enableIndexPatterns': {
      name: _toi18n('Enable rollup index patterns', 'rollupIndexPatternsTitle'),
      value: true,
      description: _toi18n(
        'Enable the creation of index patterns which capture rollup indices, which in turn enable ' +
        'visualizations based on rollup data. Refresh the page to apply the changes.',
        'rollupIndexPatternsText'
      ),
      category: ['rollups'],
    },
  };
}
