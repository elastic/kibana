import _ from 'lodash';
const OPERANDS_IN_RANGE = 2;

/**
 *
 * @param { Object } field - a Field object
 * @param { Object } params - any valid param for the ES range query
 * @param { Object } indexPattern - an IndexPattern object
 * @param { Function } formattedValue - a formatting function
 *
 * @return { Object } a filter object
 */
export function buildRangeFilter(field, params, indexPattern, formattedValue) {
  if (_.isUndefined(field)) {
    throw new Error('field is a required argument');
  }
  if (_.isUndefined(params)) {
    throw new Error('params is a required argument');
  }
  if (_.isUndefined(indexPattern)) {
    throw new Error('indexPattern is a required argument');
  }

  const filterDelegate = {
    needsGoodName: function () {
      return {
        index: this.meta.index,
        field: this.meta.field,
        type: this.meta.type,
        params: this.meta.params,
        disabled: this.meta.disabled,
        negate: this.meta.negate,
        alias: this.meta.alias
      };
    }
  };

  const filter = Object.assign(Object.create(filterDelegate), { meta: { index: indexPattern.id } });

  if (formattedValue) filter.meta.formattedValue = formattedValue;

  params = _.clone(params);

  if ('gte' in params && 'gt' in params) throw new Error('gte and gt are mutually exclusive');
  if ('lte' in params && 'lt' in params) throw new Error('lte and lt are mutually exclusive');

  const totalInfinite = ['gt', 'lt'].reduce((totalInfinite, op) => {
    const key = op in params ? op : `${op}e`;
    const isInfinite = Math.abs(params[key]) === Infinity;

    if (isInfinite) {
      totalInfinite++;
      delete params[key];
    }

    return totalInfinite;
  }, 0);

  if (totalInfinite === OPERANDS_IN_RANGE) {
    filter.match_all = {};
    filter.meta.field = field.name;
    filter.meta.type = 'matchAll';
  } else if (field.scripted) {
    const operators = {
      gt: '>',
      gte: '>=',
      lte: '<=',
      lt: '<',
    };
    const comparators = {
      gt: 'boolean gt(Supplier s, def v) {return s.get() > v}',
      gte: 'boolean gte(Supplier s, def v) {return s.get() >= v}',
      lte: 'boolean lte(Supplier s, def v) {return s.get() <= v}',
      lt: 'boolean lt(Supplier s, def v) {return s.get() < v}',
    };

    const knownParams = _.pick(params, (val, key) => { return key in operators; });
    let script = _.map(knownParams, function (val, key) {
      return '(' + field.script + ')' + operators[key] + key;
    }).join(' && ');

    // We must wrap painless scripts in a lambda in case they're more than a simple expression
    if (field.lang === 'painless') {
      const currentComparators = _.reduce(knownParams, (acc, val, key) => acc.concat(comparators[key]), []).join(' ');

      const comparisons = _.map(knownParams, function (val, key) {
        return `${key}(() -> { ${field.script} }, params.${key})`;
      }).join(' && ');

      script = `${currentComparators}${comparisons}`;
    }

    const value = _.map(knownParams, function (val, key) {
      return operators[key] + field.format.convert(val);
    }).join(' ');

    _.set(filter, 'script.script', { inline: script, params: knownParams, lang: field.lang });
    filter.script.script.params.value = value;
    filter.meta.field = field.name;
    filter.meta.type = 'script';
  } else {
    filter.range = {};
    filter.range[field.name] = params;
    filter.meta.field = field.name;
    filter.meta.type = 'range';
    filter.meta.params = params;
    filter.meta.key = filter.meta.field;
    filter.meta.disabled = false;
    filter.meta.negate = false;
    filter.meta.alias = null;

    const convert = indexPattern.fields.byName[field.name].format.getConverterFor('text');
    let left = _.has(params, 'gte') ? params.gte : params.gt;
    if (left == null) left = -Infinity;

    let right = _.has(params, 'lte') ? params.lte : params.lt;
    if (right == null) right = Infinity;
    filter.meta.value = `${convert(left)} to ${convert(right)}`;

  }

  return filter;
}
