const _ = require('lodash');
const Promise = require('bluebird');

module.exports = function getMappings(pattern, client) {
  const templateName = `kibana-${pattern.toLowerCase()}`;

  return client.indices.getTemplate({
    name: templateName
  }).then((template) => {
    let mappings = template[templateName].mappings;
    let mergedMappings = {};
    _.forEach(mappings, (type) => {
      _.forEach(type.properties, (value, key) => {
        mergedMappings[key] = value;
      });
    });
    return mergedMappings;
  }, (error) => {
    return client.indices.getFieldMapping({
      index: pattern,
      field: '*',
      ignore_unavailable: false,
      allow_no_indices: false,
      include_defaults: true
    }).then((fieldMappings) => {
      return _.mapValues(_.reduce(fieldMappings, (mergedMappings, indexMappings) => {
        return _.reduce(indexMappings.mappings, (mergedMappings, typeMappings) => {
          return _.defaults(mergedMappings, typeMappings);
        }, mergedMappings);
      }, {}), (value) => {
        return value.mapping[_.last(value.full_name.split('.'))];
      });
    });
  });
};
