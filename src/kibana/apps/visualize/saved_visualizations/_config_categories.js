define(function (require) {
  var _ = require('lodash');
  var categories = [
    {
      name: 'segment',
      displayOrder: 2,
      fetchOrder: 1,
      min: 0,
      max: Infinity,
      configDefaults: {
        size: 5
      }
    },
    {
      name: 'metric',
      displayOrder: 1,
      fetchOrder: 2,
      min: 0,
      max: 1,
      configDefaults: {
        agg: 'count'
      }
    },
    {
      name: 'group',
      displayOrder: 3,
      fetchOrder: 3,
      min: 0,
      max: 1,
      configDefaults: {
        global: true,
        size: 5
      }
    },
    {
      name: 'split',
      displayOrder: 4,
      fetchOrder: 4,
      min: 0,
      max: 2,
      configDefaults: {
        size: 5,
        row: true
      }
    }
  ];

  categories.fetchOrder = _.sortBy(categories, 'fetchOrder');
  categories.displayOrder = _.sortBy(categories, 'displayOrder');
  categories.byName = _.indexBy(categories, 'name');

  return categories;
});