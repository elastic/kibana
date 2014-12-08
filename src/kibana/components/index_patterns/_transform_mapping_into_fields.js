define(function (require) {
  return function transformMappingIntoFields(Private, configFile, config) {
    var _ = require('lodash');
    var MappingConflict = require('errors').MappingConflict;
    var castMappingType = Private(require('components/index_patterns/_cast_mapping_type'));
    var mapField = Private(require('components/index_patterns/_map_field'));


    /**
     * Convert the ES response into the simple map for fields to
     * mappings which we will cache
     *
     * @param  {object} response - complex, excessively nested
     *                           object returned from ES
     * @return {object} - simple object that works for all of kibana
     *                    use-cases
     */
    return function (response) {
      var fields = {};
      _.each(response, function (index, indexName) {
        if (indexName === configFile.kibana_index) return;
        _.each(index.mappings, function (mappings, typeName) {
          _.each(mappings, function (field, name) {
            var keys = Object.keys(field.mapping);
            if (keys.length === 0 || (name[0] === '_') && !_.contains(config.get('metaFields'), name)) return;

            var mapping = mapField(field, name);

            if (fields[name]) {
              if (fields[name].type !== mapping.type) {
                // conflict fields are not available for much except showing in the discover table
                mapping.type = 'conflict';
                mapping.indexed = false;
              }
            }
            fields[name] = _.pick(mapping, 'type', 'indexed', 'analyzed', 'doc_values');
          });
        });
      });

      return _.map(fields, function (mapping, name) {
        mapping.name = name;
        return mapping;
      });
    };
  };
});
