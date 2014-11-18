define(function (require) {
  require('filters/short_dots');
  return function MetricAggsService(Private, $filter) {
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
          return 'Average ' + $filter('shortDots')(aggConfig.params.field.name);
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
          return 'Sum of ' + $filter('shortDots')(aggConfig.params.field.name);
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
          return 'Min ' + $filter('shortDots')(aggConfig.params.field.name);
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
          return 'Max ' + $filter('shortDots')(aggConfig.params.field.name);
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
          return 'Unique count of ' + $filter('shortDots')(aggConfig.params.field.name);
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