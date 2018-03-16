export function addFilter(field, values = [], operation, index, state, filterManager) {
  if (!Array.isArray(values)) {
    values = [values];
  }

  filterManager.add(field, values, operation, index);
}
