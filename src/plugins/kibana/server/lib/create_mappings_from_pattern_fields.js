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
        type: 'string',
        index: 'analyzed',
        omit_norms: true,
        fielddata: {format: 'disabled'},
        fields: {
          raw: {type: 'string', index: 'not_analyzed', doc_values: true, ignore_above: 256}
        }
      };
    }
    else {
      const fieldType = field.type === 'number' ? 'double' : field.type;
      mapping = {
        type: fieldType,
        index: 'not_analyzed',
        doc_values: true
      };
    }

    _.set(mappings, field.name.split('.').join('.properties.'), mapping);
  });

  return mappings;
};
