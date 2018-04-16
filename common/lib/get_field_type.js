import { unquoteString } from './unquote_string';

export function getFieldType(columns, field) {
  if (!field) return 'null';
  const realField = unquoteString(field);
  const column = columns.find(column => column.name === realField);
  return column ? column.type : 'null';
}
