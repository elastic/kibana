import _ from 'lodash';
import {Promise} from 'bluebird';

/**
 * Returns normalized mappings for fields in indices matching pattern.
 *
 * @param {(string|string[])} indices - An index pattern or array of patterns e.g. 'logstash-*'
 * @param {function} boundCallWithRequest - a partial application of callWithRequest bound to the current request
 * @returns {object} Mappings keyed by field name.
 */
export default function (indices, boundCallWithRequest) {

  const fieldMappingParams = {
    index: indices,
    fields: '*',
    ignore_unavailable: _.isArray(indices),
    allow_no_indices: false,
    include_defaults: true
  };

  return boundCallWithRequest('indices.getFieldMapping', fieldMappingParams)
  .then((fieldMappings) => {
    return _.reduce(fieldMappings, (mergedMappings, indexMappings) => {
      return _.reduce(indexMappings.mappings, (mergedMappings, typeMappings) => {
        return _.assign(mergedMappings, typeMappings, function (mergedValue, typeValue, key) {
          const shortName = _.last(typeValue.full_name.split('.'));
          if (mergedValue === undefined) {
            return typeValue.mapping[shortName];
          }
          else {
            if (mergedValue.type !== typeValue.mapping[shortName].type) {
              mergedValue.type = 'conflict';
              mergedValue.index = false;
            }
            return mergedValue;
          }
        });
      }, mergedMappings);
    }, {});
  });
};
