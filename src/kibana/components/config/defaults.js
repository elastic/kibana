define(function (require) {
  var _ = require('lodash');

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
      value: 6,
      description: 'The maximum geoHash size allowed in a tile map',
    },
    'visualization:tileMap:wms': {
      value: false,
      description: 'Set for a WMS mapping provider, see <a href="http://leafletjs.com/reference.html#tilelayer-wms">leafletjs reference</a>'
    },
    'visualization:tileMap:url': {
      value: 'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg',
      description: 'URL of mapping provider, see <a href="http://leafletjs.com/reference.html#tilelayer">leafletjs reference</a>'
    },
    'visualization:tileMap:options': {
      value: null,
      description: 'TileLayer options, see <a href="http://leafletjs.com/reference.html#tilelayer">leafletjs reference</a>',
      type: 'json'
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
    }
  };
});
