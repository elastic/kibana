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
      value: '{ "analyze_wildcard": true, "default_field": "*" }',
      description: '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html" target="_blank" rel="noopener noreferrer">Options</a> for the lucene query string parser',
      type: 'json'
    },
    'query:allowLeadingWildcards': {
      value: true,
      description: `When set, * is allowed as the first character in a query clause. Currently only applies when experimental query
        features are enabled in the query bar. To disallow leading wildcards in basic lucene queries, use query:queryString:options`,
    },
    'search:queryLanguage': {
      value: 'lucene',
      description: 'Query language used by the query bar. Kuery is an experimental new language built specifically for Kibana.',
      type: 'select',
      options: ['lucene', 'kuery']
    },
    'sort:options': {
      value: '{ "unmapped_type": "boolean" }',
      description: '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-sort.html" target="_blank" rel="noopener noreferrer">Options</a> for the Elasticsearch sort parameter',
      type: 'json'
    },
    'dateFormat': {
      value: 'MMMM Do YYYY, HH:mm:ss.SSS',
      description: 'When displaying a pretty formatted date, use this <a href="http://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">format</a>',
    },
    'dateFormat:tz': {
      value: 'Browser',
      description: 'Which timezone should be used.  "Browser" will use the timezone detected by your browser.',
      type: 'select',
      options: ['Browser', ...moment.tz.names()]
    },
    'dateFormat:scaled': {
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
        'Values that define the format used in situations where timebased' +
        ' data is rendered in order, and formatted timestamps should adapt to the' +
        ' interval between measurements. Keys are' +
        ' <a href="http://en.wikipedia.org/wiki/ISO_8601#Time_intervals" target="_blank" rel="noopener noreferrer">' +
        'ISO8601 intervals.</a>'
      )
    },
    'dateFormat:dow': {
      value: defaultWeekday,
      description: 'What day should weeks start on?',
      type: 'select',
      options: weekdays
    },
    'defaultIndex': {
      value: null,
      description: 'The index to access if no index is set',
    },
    'defaultColumns': {
      value: ['_source'],
      description: 'Columns displayed by default in the Discovery tab',
    },
    'metaFields': {
      value: ['_source', '_id', '_type', '_index', '_score'],
      description: 'Fields that exist outside of _source to merge into our document when displaying it',
    },
    'discover:sampleSize': {
      value: 500,
      description: 'The number of rows to show in the table',
    },
    'discover:aggs:terms:size': {
      value: 20,
      type: 'number',
      description: 'Determines how many terms will be visualized when clicking the "visualize" ' +
      'button, in the field drop downs, in the discover sidebar.'
    },
    'discover:sort:defaultOrder': {
      value: 'desc',
      options: ['desc', 'asc'],
      type: 'select',
      description: 'Controls the default sort direction for time based index patterns in the Discover app.',
    },
    'doc_table:highlight': {
      value: true,
      description: 'Highlight results in Discover and Saved Searches Dashboard.' +
        'Highlighting makes requests slow when working on big documents.',
    },
    'courier:maxSegmentCount': {
      value: 30,
      description: 'Requests in discover are split into segments to prevent massive requests from being sent to ' +
        'elasticsearch. This setting attempts to prevent the list of segments from getting too long, which might ' +
        'cause requests to take much longer to process'
    },
    'courier:ignoreFilterIfFieldNotInIndex': {
      value: false,
      description: 'This configuration enhances support for dashboards containing visualizations accessing dissimilar indexes. ' +
        'When set to false, all filters are applied to all visualizations. ' +
        'When set to true, filter(s) will be ignored for a visualization ' +
        'when the visualization\'s index does not contain the filtering field.'
    },
    'courier:setRequestPreference': {
      value: 'sessionId',
      options: ['sessionId', 'custom', 'none'],
      type: 'select',
      description: 'Allows you to set which shards handle your search requests. ' +
        '<ul>' +
        '<li><strong>sessionId:</strong> restricts operations to execute all search requests on the same shards. ' +
        'This has the benefit of reusing shard caches across requests. ' +
        '<li><strong>custom:</strong> allows you to define a your own preference. ' +
        'Use <strong>courier:customRequestPreference</strong> to customize your preference value. ' +
        '<li><strong>none:</strong> means do not set a preference. ' +
        'This might provide better performance because requests can be spread across all shard copies. ' +
        'However, results might be inconsistent because different shards might be in different refresh states.' +
        '</ul>'
    },
    'courier:customRequestPreference': {
      value: '_local',
      type: 'string',
      description: '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-preference.html" target="_blank" rel="noopener noreferrer">Request Preference</a> ' +
        ' used when <strong>courier:setRequestPreference</strong> is set to "custom".'
    },
    'fields:popularLimit': {
      value: 10,
      description: 'The top N most popular fields to show',
    },
    'histogram:barTarget': {
      value: 50,
      description: 'Attempt to generate around this many bars when using "auto" interval in date histograms',
    },
    'histogram:maxBars': {
      value: 100,
      description: 'Never show more than this many bars in date histograms, scale values if needed',
    },
    'visualize:enableLabs': {
      value: true,
      description: 'Enable lab visualizations in Visualize.'
    },
    'visualization:tileMap:maxPrecision': {
      value: 7,
      description: 'The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, ' +
      '12 is the max. ' +
      '<a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/' +
      'search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator" ' +
      'target="_blank" rel="noopener noreferrer">' +
      'Explanation of cell dimensions</a>',
    },
    'visualization:tileMap:WMSdefaults': {
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
      description: 'Default <a href="http://leafletjs.com/reference.html#tilelayer-wms" target="_blank" rel="noopener noreferrer">properties</a> for the WMS map server support in the coordinate map'
    },
    'visualization:regionmap:showWarnings': {
      value: true,
      description: 'Whether the region map show a warning when terms cannot be joined to a shape on the map.'
    },
    'visualization:colorMapping': {
      type: 'json',
      value: JSON.stringify({
        Count: '#00A69B'
      }),
      description: 'Maps values to specified colors within visualizations'
    },
    'visualization:loadingDelay': {
      value: '2s',
      description: 'Time to wait before dimming visualizations during query'
    },
    'visualization:dimmingOpacity': {
      type: 'number',
      value: 0.5,
      description: 'The opacity of the chart items that are dimmed when highlighting another element of the chart. ' +
      'The lower this number, the more the highlighted element will stand out.' +
      'This must be a number between 0 and 1.'
    },
    'csv:separator': {
      value: ',',
      description: 'Separate exported values with this string',
    },
    'csv:quoteValues': {
      value: true,
      description: 'Should values be quoted in csv exports?',
    },
    'history:limit': {
      value: 10,
      description: 'In fields that have history (e.g. query inputs), show this many recent values',
    },
    'shortDots:enable': {
      value: false,
      description: 'Shorten long fields, for example, instead of foo.bar.baz, show f.b.baz',
    },
    'truncate:maxHeight': {
      value: 115,
      description: 'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation'
    },
    'indexPattern:fieldMapping:lookBack': {
      value: 5,
      description: 'For index patterns containing timestamps in their names, look for this many recent matching ' +
        'patterns from which to query the field mapping'
    },
    'indexPatterns:warnAboutUnsupportedTimePatterns': {
      value: false,
      description: 'When an index pattern is using the now unsupported "time pattern" format, a warning will ' +
        'be displayed once per session that is using this pattern. Set this to false to disable that warning.'
    },
    'format:defaultTypeMap': {
      type: 'json',
      value:
`{
  "ip": { "id": "ip", "params": {} },
  "date": { "id": "date", "params": {} },
  "number": { "id": "number", "params": {} },
  "boolean": { "id": "boolean", "params": {} },
  "_source": { "id": "_source", "params": {} },
  "_default_": { "id": "string", "params": {} }
}`,
      description: 'Map of the format name to use by default for each field type. ' +
        '"_default_" is used if the field type is not mentioned explicitly'
    },
    'format:number:defaultPattern': {
      type: 'string',
      value: '0,0.[000]',
      description: 'Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "number" format'
    },
    'format:bytes:defaultPattern': {
      type: 'string',
      value: '0,0.[000]b',
      description: 'Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "bytes" format'
    },
    'format:percent:defaultPattern': {
      type: 'string',
      value: '0,0.[000]%',
      description: 'Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "percent" format'
    },
    'format:currency:defaultPattern': {
      type: 'string',
      value: '($0,0.[00])',
      description: 'Default <a href="http://numeraljs.com/" target="_blank" rel="noopener noreferrer">numeral format</a> for the "currency" format'
    },
    'format:number:defaultLocale': {
      value: 'en',
      type: 'select',
      options: numeralLanguageIds,
      description: '<a href="http://numeraljs.com/" target="_blank" rel="noopener">numeral language</a>'
    },
    'savedObjects:perPage': {
      type: 'number',
      value: 5,
      description: 'Number of objects to show per page in the load dialog'
    },
    'savedObjects:listingLimit': {
      type: 'number',
      value: 1000,
      description: 'Number of objects to fetch for the listing pages'
    },
    'timepicker:timeDefaults': {
      type: 'json',
      value:
`{
  "from": "now-15m",
  "to": "now",
  "mode": "quick"
}`,
      description: 'The timefilter selection to use when Kibana is started without one'
    },
    'timepicker:refreshIntervalDefaults': {
      type: 'json',
      value:
`{
  "display": "Off",
  "pause": false,
  "value": 0
}`,
      description: 'The timefilter\'s default refresh interval'
    },
    'timepicker:quickRanges': {
      type: 'json',
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
      description: 'The list of ranges to show in the Quick section of the time picker. ' +
        'This should be an array of objects, with each object containing "from", "to" (see ' +
        '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math" target="_blank" rel="noopener noreferrer">accepted formats</a>' +
        '), "display" (the title to be displayed), and "section" (which column to put the option in).'
    },
    'dashboard:defaultDarkTheme': {
      value: false,
      description: 'New dashboards use dark theme by default'
    },
    'filters:pinnedByDefault': {
      value: false,
      description: 'Whether the filters should have a global state (be pinned) by default'
    },
    'filterEditor:suggestValues': {
      value: true,
      description: 'Set this property to false to prevent the filter editor from suggesting values for fields.'
    },
    'notifications:banner': {
      type: 'markdown',
      description: 'A custom banner intended for temporary notices to all users. <a href="https://help.github.com/articles/basic-writing-and-formatting-syntax/" target="_blank" rel="noopener noreferrer">Markdown supported</a>.',
      value: ''
    },
    'notifications:lifetime:banner': {
      value: 3000000,
      description: 'The time in milliseconds which a banner notification ' +
      'will be displayed on-screen for. Setting to Infinity will disable the countdown.',
      type: 'number',
    },
    'notifications:lifetime:error': {
      value: 300000,
      description: 'The time in milliseconds which an error notification ' +
      'will be displayed on-screen for. Setting to Infinity will disable.',
      type: 'number',
    },
    'notifications:lifetime:warning': {
      value: 10000,
      description: 'The time in milliseconds which a warning notification ' +
        'will be displayed on-screen for. Setting to Infinity will disable.',
      type: 'number',
    },
    'notifications:lifetime:info': {
      value: 5000,
      description: 'The time in milliseconds which an information notification ' +
        'will be displayed on-screen for. Setting to Infinity will disable.',
      type: 'number',
    },
    'metrics:max_buckets': {
      value: 2000,
      description: 'The maximum number of buckets a single datasource can return'
    },
    'state:storeInSessionStorage': {
      value: false,
      description: 'The URL can sometimes grow to be too large for some browsers to ' +
        'handle. To counter-act this we are testing if storing parts of the URL in ' +
        'sessions storage could help. Please let us know how it goes!'
    },
    'indexPattern:placeholder': {
      value: 'logstash-*',
      description: 'The placeholder for the field "Index name or pattern" in the "Settings > Indices" tab.',
    },
    'context:defaultSize': {
      value: 5,
      description: 'The number of surrounding entries to show in the context view',
    },
    'context:step': {
      value: 5,
      description: 'The step size to increment or decrement the context size by',
    },
    'context:tieBreakerFields': {
      value: ['_doc'],
      description: 'A comma-separated list of fields to use for tiebreaking between documents ' +
        'that have the same timestamp value. From this list the first field that ' +
        'is present and sortable in the current index pattern is used.',
    },
  };
}
