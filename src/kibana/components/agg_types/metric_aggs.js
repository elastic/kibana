define(function (require) {
  return function MetricAggsService(Private) {
    var AggType = Private(require('components/agg_types/_agg_type'));

    return [
      {
        name: 'count',
        title: 'Count',
        hasNoDsl: true,
        makeLabel: function (aggConfig) {
          return 'Count of documents';
        }
      },
      {
        name: 'avg',
        title: 'Average',
        makeLabel: function (aggConfig) {
          return 'Average ' + aggConfig.params.field.displayName;
        },
        params: [
          {
            name: 'field',
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'sum',
        title: 'Sum',
        makeLabel: function (aggConfig) {
          return 'Sum of ' + aggConfig.params.field.displayName;
        },
        params: [
          {
            name: 'field',
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'min',
        title: 'Min',
        makeLabel: function (aggConfig) {
          return 'Min ' + aggConfig.params.field.displayName;
        },
        params: [
          {
            name: 'field',
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'max',
        title: 'Max',
        makeLabel: function (aggConfig) {
          return 'Max ' + aggConfig.params.field.displayName;
        },
        params: [
          {
            name: 'field',
            filterFieldTypes: 'number'
          }
        ]
      },
      {
        name: 'cardinality',
        title: 'Unique count',
        makeLabel: function (aggConfig) {
          return 'Unique count of ' + aggConfig.params.field.displayName;
        },
        params: [
          {
            name: 'field'
          }
        ]
      }
    ].map(function (def) {
      return new AggType(def);
    });
  };
});