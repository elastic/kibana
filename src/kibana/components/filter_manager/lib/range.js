define(function (require) {
  var _ = require('lodash');
  return function buildRangeFilter(field, params, indexPattern) {
    var filter = { meta: { index: indexPattern.id} };

    if (params.gte && params.gt) throw new Error('gte and gt are mutually exclusive');
    if (params.lte && params.lt) throw new Error('lte and lt are mutually exclusive');

    if (field.scripted) {
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
