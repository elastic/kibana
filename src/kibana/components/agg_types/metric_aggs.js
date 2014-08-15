define(function (require) {
  return function MetricAggsService(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return [
      {
        name: 'count',
        title: 'Count',
        makeLabel: function (aggConfig) {
          return 'Count of documents';
        }
      },
      {
        name: 'avg',
        title: 'Average',
        makeLabel: function (aggConfig) {
          return 'Average ' + aggConfig.params.field.name;
        },
        params: [
          {
            name: 'field',
            required: true,
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'sum',
        title: 'Sum',
        makeLabel: function (aggConfig) {
          return 'Sum of ' + aggConfig.params.field.name;
        },
        params: [
          {
            name: 'field',
            required: true,
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'min',
        title: 'Min',
        makeLabel: function (aggConfig) {
          return 'Min ' + aggConfig.params.field.name;
        },
        params: [
          {
            name: 'field',
            required: true,
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'max',
        title: 'Max',
        makeLabel: function (aggConfig) {
          return 'Max ' + aggConfig.params.field.name;
        },
        params: [
          {
            name: 'field',
            required: true,
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'cardinality',
        title: 'Unique count',
        makeLabel: function (aggConfig) {
          return 'Unique count of ' + aggConfig.params.field.name;
        },
        params: [
          {
            name: 'field',
            required: true
          }
        ]
      }
    ].map(function (def) {
      return new AggType(def);
    });
  };
});