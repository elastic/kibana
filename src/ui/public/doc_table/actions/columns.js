export function addColumn(columns, columnName) {
  if (columns.includes(columnName)) {
    return;
  }

  columns.push(columnName);
}

export function removeColumn(columns, columnName) {
  if (!columns.includes(columnName)) {
    return;
  }

  columns.splice(columns.indexOf(columnName), 1);
}

export function moveColumn(columns, columnName, newIndex) {
  if (newIndex < 0) {
    return;
  }

  if (newIndex >= columns.length) {
    return;
  }

  if (!columns.includes(columnName)) {
    return;
  }

  columns.splice(columns.indexOf(columnName), 1);  // remove at old index
  columns.splice(newIndex, 0, columnName);  // insert before new index
}
