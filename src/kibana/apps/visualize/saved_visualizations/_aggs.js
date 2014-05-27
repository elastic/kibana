define(function (require) {
  return function AggsService(Private) {
    require('utils/mixins');
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

    aggs.bucketAggs = Private(require('./bucket_aggs/_index'));
    aggs.bucketAggsByName = _.indexBy(aggs.bucketAggs, 'name');

    aggs.byName = _.assign({}, aggs.bucketAggsByName, aggs.metricAggsByName);

    aggs.byFieldType = {
      number: [
        // aggs.bucketAggsByName.histogram,
        aggs.bucketAggsByName.terms,
        // 'range'
      ],
      date: [
        // 'date range',
        aggs.bucketAggsByName.date_histogram,
      ],
      boolean: [
        // 'terms'
      ],
      ip: [
        // 'ipv4 range'
      ],
      geo_point: [
        // 'geo distance'
      ],
      geo_shape: [
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