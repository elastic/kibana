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

export function getUiSettingDefaults() {
  const weekdays = moment.weekdays().slice();
  const [defaultWeekday] = weekdays;
  const numeralLanguageIds = numeralLanguages.map(function (numeralLanguage) {
    return numeralLanguage.id;
  });

  // wrapped in provider so that a new instance is given to each app/test
  return {
    'buildNum': {
      readonly: true
    },
    'query:queryString:options': {
      name: 'Query string options',
      value: '{ "analyze_wildcard": true }',
      description: '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html" target="_blank" rel="noopener noreferrer">Options</a> for the lucene query string parser',
      type: 'json'
    },
    'query:allowLeadingWildcards': {
      name: 'Allow leading wildcards in query',
      value: true,
      description: `When set, * is allowed as the first character in a query clause. Currently only applies when experimental query
        features are enabled in the query bar. To disallow leading wildcards in basic lucene queries, use query:queryString:options`,
    },
    'search:queryLanguage': {
      name: 'Query language',
      value: 'lucene',
      description: `Query language used by the query bar. Kuery is an experimental new language built specifically for Kibana.`,
      type: 'select',
      options: ['lucene', 'kuery']
    },
    'sort:options': {
      name: 'Sort options',
      value: '{ "unmapped_type": "boolean" }',
      description: `<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html"
        target="_blank" rel="noopener noreferrer">Options</a> for the Elasticsearch sort parameter`,
      type: 'json'
    },
    'dateFormat': {
      name: 'Date format',
      value: 'MMMM Do YYYY, HH:mm:ss.SSS',
      description: `When displaying a pretty formatted date, use this <a href="http://momentjs.com/docs/#/displaying/format/"
        target="_blank" rel="noopener noreferrer">format</a>`,
    },
    'dateFormat:tz': {
      name: 'Timezone for date formatting',
      value: 'Browser',
      description: `Which timezone should be used. "Browser" will use the timezone detected by your browser.`,
      type: 'select',
      options: ['Browser', ...moment.tz.names()]
    },
    'dateFormat:scaled': {
      name: 'Scaled date format',
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
      description: (
        `Values that define the format used in situations where time-based
         data is rendered in order, and formatted timestamps should adapt to the
         interval between measurements. Keys are
         <a href="http://en.wikipedia.org/wiki/ISO_8601#Time_intervals" target="_blank" rel="noopener noreferrer">
        ISO8601 intervals.</a>`
      )
    },
    'dateFormat:dow': {
      name: 'Day of week',
      value: defaultWeekday,
      description: `What day should weeks start on?`,
      type: 'select',
      options: weekdays
    },
    'defaultIndex': {
      name: 'Default index',
      value: null,
      description: `The index to access if no index is set`,
    },
    'defaultColumns': {
      name: 'Default columns',
      value: ['_source'],
      description: `Columns displayed by default in the Discovery tab`,
      category: ['discover'],
    },
    'metaFields': {
      name: 'Meta fields',
      value: ['_source', '_id', '_type', '_index', '_score'],
      description: `Fields that exist outside of _source to merge into our document when displaying it`,
    },
    'discover:sampleSize': {
      name: 'Number of rows',
      value: 500,
      description: `The number of rows to show in the table`,
      category: ['discover'],
    },
    'discover:aggs:terms:size': {
      name: 'Number of terms',
      value: 20,
      type: 'number',
      description: `Determines how many terms will be visualized when clicking the "visualize"
        button, in the field drop downs, in the discover sidebar.`,
      category: ['discover'],
    },
    'discover:sort:defaultOrder': {
      name: 'Default sort direction',
      value: 'desc',
      options: ['desc', 'asc'],
      type: 'select',
      description: `Controls the default sort direction for time based index patterns in the Discover app.`,
      category: ['discover'],
    },
    'doc_table:highlight': {
      name: 'Highlight results',
      value: true,
      description: `Highlight results in Discover and Saved Searches Dashboard.
        Highlighting makes requests slow when working on big documents.`,
      category: ['discover'],
    },
    'courier:maxSegmentCount': {
      name: 'Maximum segment count',
      value: 30,
      description: `Requests in discover are split into segments to prevent massive requests from being sent to
        elasticsearch. This setting attempts to prevent the list of segments from getting too long, which might
        cause requests to take much longer to process.`,
      category: ['search'],
    },
    'courier:ignoreFilterIfFieldNotInIndex': {
      name: 'Ignore filter(s)',
      value: false,
      description: `This configuration enhances support for dashboards containing visualizations accessing dissimilar indexes.
        When set to false, all filters are applied to all visualizations.
        When set to true, filter(s) will be ignored for a visualization
        when the visualization's index does not contain the filtering field.`,
      category: ['search'],
    },
    'courier:setRequestPreference': {
      name: 'Request preference',
      value: 'sessionId',
      options: ['sessionId', 'custom', 'none'],
      type: 'select',
      description: `Allows you to set which shards handle your search requests.
        <ul>
          <li><strong>sessionId:</strong> restricts operations to execute all search requests on the same shards.
            This has the benefit of reusing shard caches across requests.</li>
          <li><strong>custom:</strong> allows you to define a your own preference.
            Use <strong>courier:customRequestPreference</strong> to customize your preference value.</li>
          <li><strong>none:</strong> means do not set a preference.
            This might provide better performance because requests can be spread across all shard copies.
            However, results might be inconsistent because different shards might be in different refresh states.</li>
        </ul>`,
      category: ['search'],
    },
    'courier:customRequestPreference': {
      name: 'Custom request preference',
      value: '_local',
      type: 'string',
      description: `<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-preference.html"
        target="_blank" rel="noopener noreferrer">Request Preference</a>
        used when <strong>courier:setRequestPreference</strong> is set to "custom".`,
      category: ['search'],
    },
    'fields:popularLimit': {
      name: 'Popular fields limit',
      value: 10,
      description: `The top N most popular fields to show`,
    },
    'histogram:barTarget': {
      name: 'Target bars',
      value: 50,
      description: `Attempt to generate around this many bars when using "auto" interval in date histograms`,
    },
    'histogram:maxBars': {
      name: 'Maximum bars',
      value: 100,
      description: `Never show more than this many bars in date histograms, scale values if needed`,
    },
    'visualize:enableLabs': {
      name: 'Enable labs',
      value: true,
      description: `Enable lab visualizations in Visualize.`,
      category: ['visualization'],
    },
    'visualization:tileMap:maxPrecision': {
      name: 'Maximum tile map precision',
      value: 7,
      description: `The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, 12 is the max.
      <a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator"
      target="_blank" rel="noopener noreferrer">Explanation of cell dimensions</a>`,
      category: ['visualization'],
    },
    'visualization:tileMap:WMSdefaults': {
      name: 'Default WMS properties',
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
      description: `Default <a href="http://leafletjs.com/reference.html#tilelayer-wms"
        target="_blank" rel="noopener noreferrer">properties</a> for the WMS map server support in the coordinate map`,
      category: ['visualization'],
    },
    'visualization:regionmap:showWarnings': {
      name: 'Show region map warning',
      value: true,
      description: `Whether the region map shows a warning when terms cannot be joined to a shape on the map.`,
      category: ['visualization'],
    },
    'visualization:colorMapping': {
      name: 'Color mapping',
      value: JSON.stringify({
        Count: '#00A69B'
      }),
      type: 'json',
      description: `Maps values to specified colors within visualizations`,
      category: ['visualization'],
    },
    'visualization:loadingDelay': {
      name: 'Loading delay',
      value: '2s',
      description: `Time to wait before dimming visualizations during query`,
      category: ['visualization'],
    },
    'visualization:dimmingOpacity': {
      name: 'Dimming opacity',
      value: 0.5,
      type: 'number',
      description: `The opacity of the chart items that are dimmed when highlighting another element of the chart.
        The lower this number, the more the highlighted element will stand out.
        This must be a number between 0 and 1.`,
      category: ['visualization'],
    },
    'csv:separator': {
      name: 'CSV separator',
      value: ',',
      description: `Separate exported values with this string`,
    },
    'csv:quoteValues': {
      name: 'Quote CSV values',
      value: true,
      description: `Should values be quoted in csv exports?`,
    },
    'history:limit': {
      name: 'History limit',
      value: 10,
      description: `In fields that have history (e.g. query inputs), show this many recent values`,
    },
    'shortDots:enable': {
      name: 'Shorten fields',
      value: false,
      description: `Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz`,
    },
    'truncate:maxHeight': {
      name: 'Maximum table cell height',
      value: 115,
      description: `The maximum height that a cell in a table should occupy. Set to 0 to disable truncation`,
    },
    'indexPattern:fieldMapping:lookBack': {
      name: 'Recent matching patterns',
      value: 5,
      description: `For index patterns containing timestamps in their names, look for this many recent matching
        patterns from which to query the field mapping`
    },
    'indexPatterns:warnAboutUnsupportedTimePatterns': {
      name: 'Time pattern warning',
      value: false,
      description: `When an index pattern is using the now unsupported "time pattern" format, a warning will
        be displayed once per session that is using this pattern. Set this to false to disable that warning.`
    },
    'format:defaultTypeMap': {
      name: 'Field type format name',
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
      description: `Map of the format name to use by default for each field type.
        "_default_" is used if the field type is not mentioned explicitly`
    },
    'format:number:defaultPattern': {
      name: 'Number format',
      value: '0,0.[000]',
      type: 'string',
      description: `Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "number" format`
    },
    'format:bytes:defaultPattern': {
      name: 'Bytes format',
      value: '0,0.[000]b',
      type: 'string',
      description: `Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "bytes" format`
    },
    'format:percent:defaultPattern': {
      name: 'Percent format',
      value: '0,0.[000]%',
      type: 'string',
      description: `Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "percent" format`
    },
    'format:currency:defaultPattern': {
      name: 'Currency format',
      value: '($0,0.[00])',
      type: 'string',
      description: `Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "currency" format`
    },
    'format:number:defaultLocale': {
      name: 'Formatting locale',
      value: 'en',
      type: 'select',
      options: numeralLanguageIds,
      description: `<a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">Numeral language</a> locale`
    },
    'savedObjects:perPage': {
      name: 'Objects per page',
      value: 20,
      type: 'number',
      description: `Number of objects to show per page in the load dialog`
    },
    'savedObjects:listingLimit': {
      name: 'Objects listing limit',
      type: 'number',
      value: 1000,
      description: `Number of objects to fetch for the listing pages`
    },
    'timepicker:timeDefaults': {
      name: 'Time picker defaults',
      value:
`{
  "from": "now-15m",
  "to": "now",
  "mode": "quick"
}`,
      type: 'json',
      description: `The timefilter selection to use when Kibana is started without one`
    },
    'timepicker:refreshIntervalDefaults': {
      name: 'Time picker refresh interval',
      value:
`{
  "pause": false,
  "value": 0
}`,
      type: 'json',
      description: `The timefilter's default refresh interval`
    },
    'timepicker:quickRanges': {
      name: 'Time picker quick ranges',
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
      description: `The list of ranges to show in the Quick section of the time picker.
        This should be an array of objects, with each object containing "from", "to" (see
        <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math"
        target="_blank" rel="noopener noreferrer">accepted formats</a>),
        "display" (the title to be displayed), and "section" (which column to put the option in).`
    },
    'dashboard:defaultDarkTheme': {
      name: 'Dark theme',
      value: false,
      description: `New dashboards use dark theme by default`,
      category: ['dashboard'],
    },
    'filters:pinnedByDefault': {
      name: 'Pin filters by default',
      value: false,
      description: `Whether the filters should have a global state (be pinned) by default`
    },
    'filterEditor:suggestValues': {
      name: 'Filter editor suggest values',
      value: true,
      description: `Set this property to false to prevent the filter editor from suggesting values for fields.`
    },
    'notifications:banner': {
      name: 'Custom banner notification',
      value: '',
      type: 'markdown',
      description: `A custom banner intended for temporary notices to all users.
        <a href="https://help.github.com/articles/basic-writing-and-formatting-syntax/"
          target="_blank" rel="noopener noreferrer">Markdown supported</a>.`,
      category: ['notifications'],
    },
    'notifications:lifetime:banner': {
      name: 'Banner notification lifetime',
      value: 3000000,
      description: `The time in milliseconds which a banner notification
        will be displayed on-screen for. Setting to Infinity will disable the countdown.`,
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:error': {
      name: 'Error notification lifetime',
      value: 300000,
      description: `The time in milliseconds which an error notification
        'will be displayed on-screen for. Setting to Infinity will disable.`,
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:warning': {
      name: 'Warning notification lifetime',
      value: 10000,
      description: `The time in milliseconds which a warning notification
        'will be displayed on-screen for. Setting to Infinity will disable.`,
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:info': {
      name: 'Info notification lifetime',
      value: 5000,
      description: `The time in milliseconds which an information notification
        will be displayed on-screen for. Setting to Infinity will disable.`,
      type: 'number',
      category: ['notifications'],
    },
    'metrics:max_buckets': {
      name: 'Maximum buckets',
      value: 2000,
      description: `The maximum number of buckets a single datasource can return`
    },
    'state:storeInSessionStorage': {
      name: 'Store URLs in session storage',
      value: false,
      description: `The URL can sometimes grow to be too large for some browsers to
        handle. To counter-act this we are testing if storing parts of the URL in
        session storage could help. Please let us know how it goes!`
    },
    'indexPattern:placeholder': {
      name: 'Index pattern placeholder',
      value: 'logstash-*',
      description: `The placeholder for the field "Index name or pattern" in the "Settings > Indices" tab.`,
    },
    'context:defaultSize': {
      name: 'Context size',
      value: 5,
      description: `The number of surrounding entries to show in the context view`,
      category: ['discover'],
    },
    'context:step': {
      name: 'Context size step',
      value: 5,
      description: `The step size to increment or decrement the context size by`,
      category: ['discover'],
    },
    'context:tieBreakerFields': {
      name: 'Tie breaker fields',
      value: ['_doc'],
      description: `A comma-separated list of fields to use for tie-breaking between documents
        that have the same timestamp value. From this list the first field that
        is present and sortable in the current index pattern is used.`,
      category: ['discover'],
    },
  };
}
