import _ from 'lodash';
const OPERANDS_IN_RANGE = 2;

export default function buildRangeFilter(field, params, indexPattern, formattedValue) {
  const filter = { meta: { index: indexPattern.id } };
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
  } else if (field.scripted) {
    const operators = {
      gt: '>',
      gte: '>=',
      lte: '<=',
      lt: '<',
    };

    const knownParams = _.pick(params, (val, key) => { return key in operators; });
    const script = _.map(knownParams, function (val, key) {
      // painless expects params.[key] while groovy and expression languages expect [key] only.
      const valuePrefix = field.lang === 'painless' ? 'params.' : '';
      return '(' + field.script + ')' + operators[key] + valuePrefix + key;
    }).join(' && ');

    const value = _.map(knownParams, function (val, key) {
      return operators[key] + field.format.convert(val);
    }).join(' ');

    _.set(filter, 'script.script', { inline: script, params: knownParams, lang: field.lang });
    filter.script.script.params.value = value;
    filter.meta.field = field.name;
  } else {
    filter.range = {};
    filter.range[field.name] = params;
  }

  return filter;
};
