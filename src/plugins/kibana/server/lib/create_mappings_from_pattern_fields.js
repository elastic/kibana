import _ from 'lodash';

// Creates an ES field mapping from a single field object in a kibana index pattern
module.exports = function createMappingsFromPatternFields(fields) {
  if (_.isEmpty(fields)) {
    throw new Error('argument must not be empty');
  }

  const mappings = {};

  _.forEach(fields, function (field) {
    let mapping;

    if (field.type === 'string') {
      mapping = {
        type: 'text',
        fields: {
          keyword: {type: 'keyword', ignore_above: 256}
        }
      };
    }
    else {
      const fieldType = field.type === 'number' ? 'double' : field.type;
      mapping = {
        type: fieldType,
        index: true,
        doc_values: true
      };
    }

    _.set(mappings, field.name.split('.').join('.properties.'), mapping);
  });

  return mappings;
};
