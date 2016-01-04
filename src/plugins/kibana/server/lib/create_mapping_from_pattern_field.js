const _ = require('lodash');

// Creates an ES field mapping from a single field object in a kibana index pattern
module.exports = function createMappingFromPatternField(field) {
  if (_.isEmpty(field)) {
    throw new Error('argument must not be empty');
  }
  const mapping = _.cloneDeep(field);

  delete mapping.count;
  delete mapping.scripted;
  delete mapping.indexed;
  delete mapping.analyzed;

  if (field.indexed === false) {
    mapping.index = 'no';
  }
  else {
    if (field.analyzed === false) {
      mapping.index = 'not_analyzed';
    }
    else if (field.analyzed === true) {
      mapping.index = 'analyzed';
    }
  }

  return mapping;
};
