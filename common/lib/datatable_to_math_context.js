import { pivotObjectArray } from '../lib/pivot_object_array.js';

// filters columns with type number and passes filtered columns to pivotObjectArray
export function datatableToMathContext(datatable) {
  const filteredColumns = datatable.columns.filter(
    col => col.type === 'number' || col.type === 'date'
  );
  return pivotObjectArray(datatable.rows, filteredColumns.map(col => col.name));
}
