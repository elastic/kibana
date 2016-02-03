import _ from 'lodash';

/**
 * @param {object} advanced setting definition object
 * @param {?} current value of the setting
 * @returns {string} the type to use for determining the display and editor
 */
function getValType(def, value) {
  if (def.type) {
    return def.type;
  }

  if (_.isArray(value) || _.isArray(def.value)) {
    return 'array';
  }

  return (def.value != null ? typeof def.value : typeof value);
}

export default getValType;
