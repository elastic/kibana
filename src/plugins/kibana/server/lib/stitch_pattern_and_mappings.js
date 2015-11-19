const _ = require('lodash');

module.exports = function stitchPatternAndMappings(pattern, mappings) {
  _.forEach(mappings, (value, key) => {
    let field = _.find(pattern.fields, {name: key});
    if (field) {
      field.mapping = value;
    }
  });

  return pattern;
};
