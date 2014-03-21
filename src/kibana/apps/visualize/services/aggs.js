define(function (require) {

  require('utils/mixins');
  var _ = require('lodash');

  function AggsService() {
    this.metricAggs = [
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
    this.metricAggsByName = _.indexBy(this.metricAggs, 'name');

    this.bucketAggs = [
      {
        name: 'histogram',
        display: 'Histogram',
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
        }
      },
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
        }
      }
    ];
    this.bucketAggsByName = _.indexBy(this.bucketAggs, 'name');

    this.aggsByName = _.assign({}, this.bucketAggsByName, this.metricAggsByName);

    this.aggsByFieldType = {
      number: [
        this.bucketAggsByName.histogram,
        this.bucketAggsByName.terms,
        // 'range'
      ],
      date: [
        // 'date range',
        this.bucketAggsByName.date_histogram,
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
        this.bucketAggsByName.terms,
        // 'range'
      ]
    };
  }

  require('modules').get('app/visualize')
    .service('Aggs', AggsService);
});