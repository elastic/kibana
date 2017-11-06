/**
 * @param {object} advanced setting definition object
 * @param {?} current value of the setting
 * @returns {string} the type to use for determining the display and editor
 */
export function getValType(def, value) {
  if (def.type) {
    return def.type;
  }

  if (Array.isArray(value) || Array.isArray(def.value)) {
    return 'array';
  }

  return (def.value != null ? typeof def.value : typeof value);
}
