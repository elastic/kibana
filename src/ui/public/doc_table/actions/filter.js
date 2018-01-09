import _ from 'lodash';
import { toKueryExpression, fromKueryExpression, nodeTypes } from 'ui/kuery';

export function addFilter(field, values = [], operation, index, state, filterManager) {
  const fieldName = _.isObject(field) ? field.name : field;

  if (!Array.isArray(values)) {
    values = [values];
  }

  if (['lucene', 'kql'].includes(state.query.language)) {
    filterManager.add(field, values, operation, index);
  }

  if (state.query.language === 'kuery') {
    const negate = operation === '-';
    const isExistsQuery = fieldName === '_exists_';

    const newQueries = values.map((value) => {
      const newQuery = isExistsQuery
        ? nodeTypes.function.buildNode('exists', value)
        : nodeTypes.function.buildNode('is', fieldName, value);

      return negate ? nodeTypes.function.buildNode('not', newQuery) : newQuery;
    });

    const allQueries = _.isEmpty(state.query.query)
      ? newQueries
      : [fromKueryExpression(state.query.query), ...newQueries];

    state.query = {
      query: toKueryExpression(nodeTypes.function.buildNode('and', allQueries, 'implicit')),
      language: 'kuery'
    };
  }
}
