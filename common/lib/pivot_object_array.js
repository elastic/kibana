import { map, zipObject } from 'lodash';

export function pivotObjectArray(rows, columns) {
  const columnNames = columns || Object.keys(rows[0]);
  const columnValues = map(columnNames, (name) => map(rows, name));
  return zipObject(columnNames, columnValues);
}
