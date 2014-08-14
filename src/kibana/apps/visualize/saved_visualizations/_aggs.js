define(function (require) {
  return function AggsService(Private) {
    require('lodash');
    var _ = require('lodash');

    var aggs = {};

    aggs.metricAggs = [
      {
        name: 'count',
        display: 'Count',
        types: ['number'],
        makeLabel: function (params) {
          return 'Count of documents';
        }
      },
      {
        name: 'avg',
        display: 'Average',
        types: ['number'],
        makeLabel: function (params) {
          return 'Average ' + params.field;
        }
      },
      {
        name: 'sum',
        display: 'Sum',
        types: ['number'],
        makeLabel: function (params) {
          return 'Sum of ' + params.field;
        }
      },
      {
        name: 'min',
        display: 'Min',
        types: ['number'],
        makeLabel: function (params) {
          return 'Min ' + params.field;
        }
      },
      {
        name: 'max',
        display: 'Max',
        types: ['number'],
        makeLabel: function (params) {
          return 'Max ' + params.field;
        }
      },
      {
        name: 'cardinality',
        display: 'Unique count',
        types: ['*'],
        makeLabel: function (params) {
          return 'Unique count of ' + params.field;
        }
      },
    ];
    aggs.metricAggsByName = _.indexBy(aggs.metricAggs, 'name');

    aggs.bucketAggs = Private(require('apps/visualize/saved_visualizations/bucket_aggs/_index'));
    aggs.bucketAggsByName = _.indexBy(aggs.bucketAggs, 'name');

    aggs.byName = _.assign({}, aggs.bucketAggsByName, aggs.metricAggsByName);

    aggs.byFieldType = {
      number: [
        aggs.bucketAggsByName.terms,
        aggs.bucketAggsByName.histogram,
        aggs.bucketAggsByName.range,
        // 'range'
      ],
      date: [
        // 'date range',
        aggs.bucketAggsByName.date_histogram,
        aggs.bucketAggsByName.terms,
      ],
      boolean: [
        aggs.bucketAggsByName.terms,
        // 'terms'
      ],
      ip: [
        aggs.bucketAggsByName.terms,
        aggs.bucketAggsByName.ip_range,
        // 'ipv4 range'
      ],
      geo_point: [
        aggs.bucketAggsByName.terms,
        // 'geo distance'
      ],
      geo_shape: [
        aggs.bucketAggsByName.terms,
        // 'geohash grid'
      ],
      string: [
        // 'significant terms',
        aggs.bucketAggsByName.terms,
        // 'range'
      ]
    };

    return aggs;
  };
});