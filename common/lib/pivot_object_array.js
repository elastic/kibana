import { map, zipObject } from 'lodash';

const isString = val => typeof val === 'string';

export function pivotObjectArray(rows, columns) {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }
  const columnValues = map(columnNames, name => map(rows, name));
  return zipObject(columnNames, columnValues);
}
