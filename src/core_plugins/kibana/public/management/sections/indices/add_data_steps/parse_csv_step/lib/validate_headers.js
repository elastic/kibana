import _ from 'lodash';

/**
 * @typedef error
 * @type Object
 * @property {String} fieldName The field name with error.
 * @property {Number[]} positions The field positions with error. One-based.
 * @property {String} type The type of error. Eg: duplicate, blank
 */

/**
 * Check for errors with header fields for csv import preview.
 * Returns an empty array if no error is found.
 *
 * @param {String[]} fields An array of field names
 * @returns {error[]} errors An array of error objects
 */
export default function validateHeaders(fields) {
  const errors = [];

  const fieldsWithPositions = _.reduce(fields, (result, field, index) => {
    (result[field] || (result[field] = [])).push(index + 1);
    return result;
  }, {});

  _.forEach(fieldsWithPositions, (positions, field) => {
    if (_.isEmpty(field)) {
      errors.push({
        positions: positions,
        type: 'blank'
      });
    }
    else if (positions.length > 1) {
      errors.push({
        fieldName: field,
        positions: positions,
        type: 'duplicate'
      });
    }
  });

  return errors;
}
