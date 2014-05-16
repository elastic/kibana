define(function (require) {
  return function AggsService(timefilter) {
    require('utils/mixins');
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');

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
          size: {
            required: false,
          },
          order: {
            required: true,
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
          var agg = aggs.byName.terms;
          var order = _.find(agg.params.order.options, { val: params.order._count });
          return order.display + ' ' + params.size + ' ' + params.field;
        }
      },
      {
        name: 'date_histogram',
        display: 'Date Histogram',
        ordinal: {},
        params: {
          interval: {
            required: true,
            default: 'auto',
            custom: true,
            options: [
              { display: 'Auto', val: 'auto' },
              { display: 'Minute', val: 'minute' },
              { display: 'Hourly', val: 'hour' },
              { display: 'Daily', val: 'day' },
              { display: 'Weekly', val: 'week' },
              { display: 'Monthly', val: 'month' },
              { display: 'Quarterly', val: 'quarter' },
              { display: 'Yearly', val: 'year' }
            ],
            toJSON: function (val) {
              if (val !== 'auto') return val;
              var bounds = timefilter.getBounds();
              var bucketParams = interval.calculate(bounds.min, bounds.max, 100);
              return bucketParams.interval + 'ms';
            }
          },
          format: {
            custom: true
          },
          min_doc_count: {
            custom: true,
            default: 0
          },
          extended_bounds: {
            default: {},
            toJSON: function () {
              var bounds = timefilter.getBounds();
              return {
                min: bounds.min,
                max: bounds.max
              };
            }
          }
        },
        makeLabel: function (params) {
          var agg = aggs.byName.date_histogram;
          var interval = _.find(agg.params.interval.options, { val: params.interval });
          if (interval) return interval.display + ' ' + params.field;
          else return params.field + '/' + moment.duration(params.interval).humanize();
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
  };
});