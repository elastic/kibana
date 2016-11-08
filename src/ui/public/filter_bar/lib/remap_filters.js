/**
 * Remap the filter from the intermediary back to it's original.
 * @param {object} filter The original filter
 * @returns {object}
 */
export default function (filter) {
  return filter.filter;
}

