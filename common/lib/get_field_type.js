// put in common

export function getFieldType(columns, field) {
  if (!field) return 'null';
  const column = columns.find(column => column.name === field);
  return column ? column.type : 'null';
}
