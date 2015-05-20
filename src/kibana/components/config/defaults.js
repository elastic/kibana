define(function () {
  return function configDefaultsProvider() {
    // wraped in provider so that a new instance is given to each app/test

    return {
      'query:queryString:options': {
        value: '{ "analyze_wildcard": true }',
        description: 'Options for the lucene query string parser',
        type: 'json'
      },
      'dateFormat': {
        value: 'MMMM Do YYYY, HH:mm:ss.SSS',
        description: 'When displaying a pretty formatted date, use this format',
      },
      'dateFormat:scaled': {
        type: 'json',
        value:
          '[\n' +
          '  ["", "hh:mm:ss.SSS"],\n' +
          '  ["PT1S", "HH:mm:ss"],\n' +
          '  ["PT1M", "HH:mm"],\n' +
          '  ["PT1H",\n' +
          '      "YYYY-MM-DD HH:mm"],\n' +
          '  ["P1DT", "YYYY-MM-DD"],\n' +
          '  ["P1YT", "YYYY"]\n' +
          ']',
        description: 'Values that define the format used in situations where timebased' +
        ' data is rendered in order, and formatted timestamps should adapt to the' +
        ' interval between measurements. Keys are ISO 8601 intervals:' +
        ' http://en.wikipedia.org/wiki/ISO_8601#Time_intervals'
      },
      'defaultIndex': {
        value: null,
        description: 'The index to access if no index is set',
      },
      'metaFields': {
        value: ['_source', '_id', '_type', '_index'],
        description: 'Fields that exist outside of _source to merge into our document when displaying it',
      },
      'discover:sampleSize': {
        value: 500,
        description: 'The number of rows to show in the table',
      },
      'fields:popularLimit': {
        value: 10,
        description: 'The top N most popular fields to show',
      },
      'format:numberPrecision': {
        value: 3,
        description: 'Round numbers to this many decimal places',
      },
      'histogram:barTarget': {
        value: 50,
        description: 'Attempt to generate around this many bar when using "auto" interval in date histograms',
      },
      'histogram:maxBars': {
        value: 100,
        description: 'Never show more than this many bar in date histograms, scale values if needed',
      },
      'visualization:tileMap:maxPrecision': {
        value: 7,
        description: 'The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, ' +
        '12 is the max. Explanation of cell dimensions: http://www.elastic.co/guide/en/elasticsearch/reference/current/' +
        'search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator',
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
        description: 'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation.'
      },
      'indexPattern:fieldMapping:lookBack': {
        value: 5,
        description: 'For index patterns containing timestamps in their names, look for this many recent matching ' +
          'patterns from which to query the field mapping.'
      },
      'format:defaultTypeMap': {
        type: 'json',
        value: [
          '{',
          '  "ip": { "id": "ip", "params": {} },',
          '  "date": { "id": "date", "params": {} },',
          '  "number": { "id": "number", "params": {} },',
          '  "_source": { "id": "_source", "params": {} },',
          '  "_default_": { "id": "string", "params": {} }',
          '}',
        ].join('\n'),
        description: 'Map of the format name to use by default for each field type. ' +
          '"_default_" is used if the field type is not mentioned explicitly.'
      },
      'format:number:defaultPattern': {
        type: 'string',
        value: '0,0.[000]'
      },
      'format:bytes:defaultPattern': {
        type: 'string',
        value: '0,0.[000]b'
      },
      'format:percent:defaultPattern': {
        type: 'string',
        value: '0,0.[000]%'
      },
      'format:currency:defaultPattern': {
        type: 'string',
        value: '($0,0.[00])'
      },
      'timepicker:timeDefaults': {
        type: 'json',
        value: JSON.stringify({
          from: 'now-15m',
          to: 'now'
        }, null, 2)
      },
      'timepicker:quickRanges': {
        type: 'json',
        value: JSON.stringify([
          { from: 'now/d',    to: 'now/d',    display: 'Today',                 section: 0 },
          { from: 'now/w',    to: 'now/w',    display: 'This week',             section: 0 },
          { from: 'now/M',    to: 'now/M',    display: 'This month',            section: 0 },
          { from: 'now/y',    to: 'now/y',    display: 'This year',             section: 0 },
          { from: 'now/d',    to: 'now',      display: 'The day so far',        section: 0 },
          { from: 'now/w',    to: 'now',      display: 'Week to date',          section: 0 },
          { from: 'now/M',    to: 'now',      display: 'Month to date',         section: 0 },
          { from: 'now/y',    to: 'now',      display: 'Year to date',          section: 0 },

          { from: 'now-1d/d', to: 'now-1d/d', display: 'Yesterday',             section: 1 },
          { from: 'now-2d/d', to: 'now-2d/d', display: 'Day before yesterday',  section: 1 },
          { from: 'now-7d/d', to: 'now-7d/d', display: 'This day last week',    section: 1 },
          { from: 'now-1w/w', to: 'now-1w/w', display: 'Previous week',         section: 1 },
          { from: 'now-1M/M', to: 'now-1M/M', display: 'Previous month',        section: 1 },
          { from: 'now-1y/y', to: 'now-1y/y', display: 'Previous year',         section: 1 },

          { from: 'now-15m',  to: 'now',      display: 'Last 15 minutes',       section: 2 },
          { from: 'now-30m',  to: 'now',      display: 'Last 30 minutes',       section: 2 },
          { from: 'now-1h',   to: 'now',      display: 'Last 1 hour',           section: 2 },
          { from: 'now-4h',   to: 'now',      display: 'Last 4 hours',          section: 2 },
          { from: 'now-12h',  to: 'now',      display: 'Last 12 hours',         section: 2 },
          { from: 'now-24h',  to: 'now',      display: 'Last 24 hours',         section: 2 },
          { from: 'now-7d',   to: 'now',      display: 'Last 7 days',           section: 2 },

          { from: 'now-30d',  to: 'now',      display: 'Last 30 days',          section: 3 },
          { from: 'now-60d',  to: 'now',      display: 'Last 60 days',          section: 3 },
          { from: 'now-90d',  to: 'now',      display: 'Last 90 days',          section: 3 },
          { from: 'now-6M',   to: 'now',      display: 'Last 6 months',         section: 3 },
          { from: 'now-1y',   to: 'now',      display: 'Last 1 year',           section: 3 },
          { from: 'now-2y',   to: 'now',      display: 'Last 2 years',          section: 3 },
          { from: 'now-5y',   to: 'now',      display: 'Last 5 years',          section: 3 },
        ], null, 2)
      },
      'timepicker:refreshIntervals': {
        type: 'json',
        value: JSON.stringify([
          { value : 0, display: 'Off', section: 0},

          { value : 5000, display: '5 seconds', section: 1},
          { value : 10000, display: '10 seconds', section: 1},
          { value : 30000, display: '30 seconds', section: 1},
          { value : 45000, display: '45 seconds', section: 1},

          { value : 60000, display: '1 minute', section: 2},
          { value : 300000, display: '5 minutes', section: 2},
          { value : 900000, display: '15 minutes', section: 2},
          { value : 1800000, display: '30 minutes', section: 2},

          { value : 3600000, display: '1 hour', section: 3},
          { value : 7200000, display: '2 hour', section: 3},
          { value : 43200000, display: '12 hour', section: 3},
          { value : 86400000, display: '1 day', section: 3}
        ], null, 2)
      }
    };
  };
});
