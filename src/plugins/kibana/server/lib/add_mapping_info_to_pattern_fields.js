const castMappingType = require('./cast_mapping_type');
const _ = require('lodash');

module.exports = function addMappingInfoToPatternFields(indexPattern, template) {
  if (!indexPattern || !template) {
    throw new Error('indexPattern and template are required arguments');
  }

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

  const dedupedMappings = _.reduce(template.mappings, function (acc, typeMappings) {
    return _.assign(acc, typeMappings.properties, function (mergedValue, propertyValue) {
      if (mergedValue === undefined) {
        return propertyValue;
      }
      if (mergedValue.type !== propertyValue.type) {
        mergedValue.type = 'conflict';
        mergedValue.index = false;
      }
      return mergedValue;
    });
  }, {});

  indexPattern.fields.forEach(function (field) {
    const mapping = dedupedMappings[field.name];

    if (mapping) {
      field.type = castMappingType(mapping.type);

      if (!mapping.index || mapping.index === 'no') {
        // elasticsearch responds with false sometimes and 'no' others
        field.indexed = false;
      } else {
        field.indexed = true;
      }

      field.analyzed = mapping.index === 'analyzed';
      field.doc_values = mapping.doc_values;

      if (mappingOverrides[field.name]) {
        _.merge(field, mappingOverrides[field.name]);
      }
    }
  });
};
