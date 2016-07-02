import castMappingType from './cast_mapping_type';
import _ from 'lodash';

export default function createPatternFieldsFromMappings(mappings) {

// Override the mapping, even if elasticsearch says otherwise
  var mappingOverrides = {
    _source: {type: '_source'},
    _index: {type: 'string'},
    _type: {type: 'string'},
    _id: {type: 'string'},
    _timestamp: {
      type: 'date',
      indexed: true
    },
    _score: {
      type: 'number',
      indexed: false
    }
  };

  return _.mapValues(mappings, function (mapping, fieldName) {
    if (mapping) {
      const field = {};

      field.type = castMappingType(mapping.type);

      if (!mapping.index || mapping.index === 'no') {
        // elasticsearch responds with false sometimes and 'no' others
        field.indexed = false;
      } else {
        field.indexed = true;
      }

      field.analyzed = mapping.index === 'analyzed' || mapping.type === 'text';
      field.doc_values = mapping.doc_values;

      if (mappingOverrides[fieldName]) {
        _.merge(field, mappingOverrides[fieldName]);
      }

      return field;
    }
  });

}
