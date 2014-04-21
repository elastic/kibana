define(function (require) {
  var module = require('modules').get('app/visualize');
  var _ = require('lodash');

  var typeDefs = [
    {
      name: 'histogram',
      previewUrl: 'kibana/apps/visualize/imgs/histogram.jpg',
      config: {
        metric: {
          label: 'Y-Axis',
          min: 1,
          max: 1
        },
        segment: {
          label: 'X-Axis',
          min: 1,
          max: 1
        },
        group: {
          label: 'Color',
          min: 0,
          max: 1
        },
        split: {
          label: 'Rows & Columns',
          min: 0,
          max: 2
        }
      }
    }
  ];

  typeDefs.byName = _.indexBy(typeDefs, 'name');

  return typeDefs;
});