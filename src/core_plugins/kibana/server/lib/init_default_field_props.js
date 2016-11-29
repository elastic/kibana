import _ from 'lodash';
import mappingOverrides from './mapping_overrides';

module.exports = function initDefaultFieldProps(fields) {
  if (fields === undefined || !_.isArray(fields)) {
    throw new Error('requires an array argument');
  }

  const results = [];

  _.forEach(fields, function (field) {
    const newField = _.cloneDeep(field);
    results.push(newField);

    if (newField.type === 'string') {
      _.defaults(newField, {
        indexed: true,
        analyzed: true,
        doc_values: false,
        scripted: false,
        count: 0
      });

      results.push({
        name: newField.name + '.keyword',
        type: 'string',
        indexed: true,
        analyzed: false,
        doc_values: true,
        scripted: false,
        count: 0
      });
    }
    else {
      _.defaults(newField, {
        indexed: true,
        analyzed: false,
        doc_values: true,
        scripted: false,
        count: 0
      });
    }

    if (mappingOverrides[newField.name]) {
      _.assign(newField, mappingOverrides[newField.name]);
    }
  });

  return results;
};
