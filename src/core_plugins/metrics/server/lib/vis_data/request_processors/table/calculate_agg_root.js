import _ from 'lodash';
export function calculateAggRoot(doc, column) {
  let aggRoot = `aggs.pivot.aggs.${column.id}.aggs`;
  if (_.has(doc,  `aggs.pivot.aggs.${column.id}.aggs.column_filter`)) {
    aggRoot = `aggs.pivot.aggs.${column.id}.aggs.column_filter.aggs`;
  }
  return aggRoot;
}

