// Adds a filter to a passed state
define(function (require) {
  var _ = require('lodash');
  var self = this;

  // TODO: On array fields, negating does not negate the combination, rather all terms
  this.add =  function (field, values, operation, index) {
    values = _.isArray(values) ? values : [values];

    var negate = operation === '-';

    // Grap the filters from the searchSource and ensure it's an array
    var filters = _.flatten([self.$state.filters], true);

    _.each(values, function (value) {
      var existing = _.find(filters, function (filter) {
        if (!filter) return;

        if (field === '_exists_' && filter.exists) {
          return filter.exists.field === value;
        }

        if (field === '_missing_' && filter.missing) {
          return filter.missing.field === value;
        }

        if (filter.query) {
          return filter.query.match[field] && filter.query.match[field].query === value;
        }
      });

      if (existing) {
        if (existing.meta.negate !== negate) existing.meta.negate = negate;
        return;
      }

      switch (field) {
      case '_exists_':
        filters.push({
          exists: {
            field: value
          }
        });
        break;
      case '_missing_':
        filters.push({
          missing: {
            field: value
          }
        });
        break;
      default:
        var filter = { meta: { negate: negate, index: index || self.$state.index }, query: { match: {} } };
        filter.query.match[field] = { query: value, type: 'phrase' };
        filters.push(filter);
        break;
      }
    });

    self.$state.filters = filters;
  };

  return this;
});
