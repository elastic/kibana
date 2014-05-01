define(function (require) {
  return function transformMappingIntoFields(Private, configFile) {
    var _ = require('lodash');
    var MappingConflict = Private(require('../_errors')).MappingConflict;
    var castMappingType = Private(require('./_cast_mapping_type'));

    var reservedFields = {
      _id: { type: 'string'},
      _type: { type: 'string' },
      _index: { type: 'string' }
    };

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
      var fields = _.cloneDeep(reservedFields);
      _.each(response, function (index, indexName) {
        if (indexName === configFile.kibanaIndex) return;
        _.each(index.mappings, function (mappings, typeName) {
          _.each(mappings, function (field, name) {
            var keys = Object.keys(field.mapping);
            if (keys.length === 0 || name[0] === '_') return;

            var mapping = _.cloneDeep(field.mapping[keys.shift()]);
            mapping.type = castMappingType(mapping.type);

            if (fields[name]) {
              if (fields[name].type !== mapping.type) {
                throw new MappingConflict(name);
              }
              return;
            }

            fields[name] = mapping;
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