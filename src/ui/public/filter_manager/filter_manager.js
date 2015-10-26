// Adds a filter to a passed state
define(function (require) {
  return function (Private) {
    var _ = require('lodash');
    var queryFilter = Private(require('ui/filter_bar/query_filter'));
    var filterManager = {};

    filterManager.add = function (field, values, operation, index) {
      values = _.isArray(values) ? values : [values];
      var fieldName = _.isObject(field) ? field.name : field;
      var filters = _.flatten([queryFilter.getAppFilters()]);
      var newFilters = [];

      var negate = (operation === '-');

      // TODO: On array fields, negating does not negate the combination, rather all terms
      _.each(values, function (value) {
        var filter;
        var existing = _.find(filters, function (filter) {
          if (!filter) return;

          if (fieldName === '_exists_' && filter.exists) {
            return filter.exists.field === value;
          }

          if (filter.query) {
            return filter.query.match[fieldName] && filter.query.match[fieldName].query === value;
          }

          if (filter.script) {
            return filter.meta.field === fieldName && filter.script.params.value === value;
          }
        });

        if (existing) {
          existing.meta.disabled = false;
          if (existing.meta.negate !== negate) {
            queryFilter.invertFilter(existing);
          }
          return;
        }

        switch (fieldName) {
          case '_exists_':
            filter = {
              meta: {
                negate: negate,
                index: index
              },
              exists: {
                field: value
              }
            };
            break;
          default:
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

            break;
        }

        newFilters.push(filter);
      });

      return queryFilter.addFilters(newFilters);
    };

    return filterManager;
  };
});
