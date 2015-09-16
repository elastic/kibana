define(function (require) {
  var _ = require('lodash');
  var OPERANDS_IN_RANGE = 2;

  return function buildRangeFilter(field, params, indexPattern, formattedValue) {
    var filter = { meta: { index: indexPattern.id } };
    if (formattedValue) filter.meta.formattedValue = formattedValue;

    // when there is a method attached to params elsewhere, it must be removed
    // for filters to be generated correctly
    params = _.omit(params, _.isFunction);

    if ('gte' in params && 'gt' in params) throw new Error('gte and gt are mutually exclusive');
    if ('lte' in params && 'lt' in params) throw new Error('lte and lt are mutually exclusive');

    var totalInfinite = ['gt', 'lt'].reduce(function (totalInfinite, op) {
      var key = op in params ? op : op + 'e';
      var isInfinite = Math.abs(params[key]) === Infinity;

      if (isInfinite) {
        totalInfinite++;
        delete params[key];
      }

      return totalInfinite;
    }, 0);

    if (totalInfinite === OPERANDS_IN_RANGE) {
      filter.match_all = {};
      filter.meta.field = field.name;
    } else if (field.scripted) {
      var operators = {
        gt: '>',
        gte: '>=',
        lte: '<=',
        lt: '<',
      };

      var script = _.map(params, function (val, key) {
        return '(' + field.script + ')' + operators[key] + key;
      }).join(' && ');

      var value = _.map(params, function (val, key) {
        return operators[key] + field.format.convert(val);
      }).join(' ');

      filter.script = { script: script, params: params, lang: field.lang };
      filter.script.params.value = value;
      filter.meta.field = field.name;
    } else {
      filter.range = {};
      filter.range[field.name] = params;
    }

    return filter;
  };
});
