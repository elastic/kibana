define(function (require) {
  require('utils/mixins');
  var _ = require('lodash');

  var aggs = {};

  aggs.metricAggs = [
    {
      name: 'count',
      display: 'Count'
    },
    {
      name: 'avg',
      display: 'Average'
    },
    {
      name: 'sum',
      display: 'Sum'
    },
    {
      name: 'min',
      display: 'Min'
    },
    {
      name: 'max',
      display: 'Max'
    }
  ];
  aggs.metricAggsByName = _.indexBy(aggs.metricAggs, 'name');

  aggs.bucketAggs = [
    // {
    //   name: 'histogram',
    //   display: 'Histogram',
    //   params: {
    //     size: {},
    //     order: {
    //       options: [
    //         { display: 'Top', val: 'desc' },
    //         { display: 'Bottom', val: 'asc' }
    //       ],
    //       default: 'desc',
    //       toJSON: function (val) {
    //         return { _count: val };
    //       }
    //     }
    //   },
    //   makeLabel: function (params) {

    //   }
    // },
    {
      name: 'terms',
      display: 'Terms',
      params: {
        size: {},
        order: {
          options: [
            { display: 'Top', val: 'desc' },
            { display: 'Bottom', val: 'asc' }
          ],
          default: 'desc',
          toJSON: function (val) {
            return { _count: val };
          }
        }
      },
      makeLabel: function (params) {
        var order = _.find(aggs.params.order.options, { val: params.order._count });
        return order.display + ' ' + params.size + ' ' + params.field;
      }
    },
    {
      name: 'date_histogram',
      display: 'Date Histogram',
      params: {
        interval: {
          options: [
            { display: 'Hourly', val: 'hour' },
            { display: 'Daily', val: 'day' },
            { display: 'Weekly', val: 'week' },
            { display: 'Monthly', val: 'month' },
            { display: 'Quarterly', val: 'quarter' },
            { display: 'Yearly', val: 'year' }
          ],
          default: 'hour'
        },
      },
      makeLabel: function (params) {
        var interval = _.find(aggs.params.interval.options, { val: params.interval });
        return interval.display + ' ' + params.field;
      }
    }
  ];
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
});