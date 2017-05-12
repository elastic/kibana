import { map, zipObject } from 'lodash';

export function getMathjsScope(datatable) {
  const columnNames = map(datatable.columns, 'name');

  const columnValues = map(columnNames, (name) => map(datatable.rows, name));

  const mathScope = zipObject(columnNames, columnValues);

  return mathScope;
}
