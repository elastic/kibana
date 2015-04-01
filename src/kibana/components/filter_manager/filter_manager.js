// Adds a filter to a passed state
define(function (require) {
  var _ = require('lodash');
  var self = this;

  this.init = function ($state) {
    self.$state = $state;
  };

  this.add =  function (field, values, operation, index) {

    values = _.isArray(values) ? values : [values];

    // Have we been passed a simple name or an actual field object?

    var fieldName = _.isObject(field) ? field.name : field;

    var negate = operation === '-';
    var filters = _.flatten([self.$state.filters], true);

    // TODO: On array fields, negating does not negate the combination, rather all terms
    _.each(values, function (value) {
      var existing = _.find(filters, function (filter) {
        if (!filter) return;

        if (fieldName === '_exists_' && filter.exists) {
          return filter.exists.field === value;
        }

        if (filter.query) {
          return filter.query.match[fieldName] && filter.query.match[fieldName].query === value;
        }
      });

      if (existing) {
        if (existing.meta.negate !== negate) {
          existing.meta.negate = negate;
        }
        return;
      }

      switch (fieldName) {
      case '_exists_':
        filters.push({ meta: { negate: negate, index: index }, exists: { field: value } });
        break;
      default:
        var filter;
        if (field.scripted) {
          filter = {
            meta: { negate: negate, index: index, field: fieldName },
            script: {
              script: '(' + field.script + ') == value',
              lang: field.lang,
              params: {
                value: value
              }
            }
          };
        } else {
          filter = { meta: { negate: negate, index: index }, query: { match: {} } };
          filter.query.match[fieldName] = { query: value, type: 'phrase' };
        }
        filters.push(filter);

        break;
      }
    });

    self.$state.filters = filters;
  };

  return this;
});
