const _ = require('lodash');

/**
 *
 * @param {Object} pattern - An index pattern from .kibana
 * @param {Object} mappings - Mappings from the template or indices that match the pattern, keyed by field name
 * @returns {Object} - The index pattern with the 'mapping' property added to each object in the fields array, matched
 *  from given array of mappings
 */
module.exports = function stitchPatternAndMappings(pattern, mappings) {
  _.forEach(mappings, (value, key) => {
    let field = _.find(pattern.fields, {name: key});
    if (field) {
      field.mapping = value;
    }
  });

  return pattern;
};
