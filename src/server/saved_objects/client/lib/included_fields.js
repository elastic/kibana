/**
 * Provides an array of paths for ES source filtering
 *
 * @param {string} type
 * @param {string|array} fields
 * @returns {array}
 */
export function includedFields(type, fields) {
  if (!fields || fields.length === 0) return;

  // convert to an array
  const sourceFields = typeof fields === 'string' ? [fields] : fields;
  const sourceType = type || '*';

  return sourceFields.map(f => `${sourceType}.${f}`)
    .concat('type')
    .concat(fields); // v5 compatibility
}
