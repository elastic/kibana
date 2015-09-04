define(function (require) {
  return function MapFieldFn(Private, config) {
    var _ = require('lodash');
    var castMappingType = Private(require('components/index_patterns/_cast_mapping_type'));

    /**
     * Accepts a field object and its name, and tries to give it a mapping
     * @param  {Object} field - the field mapping returned by elasticsearch
     * @param  {String} type - name of the field
     * @return {Object} - the resulting field after overrides and tweaking
     */
    return function mapField(field, name) {
      var keys = Object.keys(field.mapping);
      if (keys.length === 0 || (name[0] === '_') && !_.contains(config.get('metaFields'), name)) return;

      var mapping = _.cloneDeep(field.mapping[keys.shift()]);
      mapping.type = castMappingType(mapping.type);

      // Override the mapping, even if elasticsearch says otherwise
      var mappingOverrides = {
        _timestamp: {
          type: 'date',
          indexed: true
        },
        _source: { type: '_source' },
        _index: { type: 'string' },
        _type: { type: 'string' },
        _id: { type: 'string' },
      };

      if (!mapping.index || mapping.index === 'no') {
        // elasticsearch responds with false sometimes and 'no' others
        mapping.indexed = false;
      } else {
        mapping.indexed = true;
      }

      mapping.analyzed = mapping.index === 'analyzed' ? true : false;

      if (mappingOverrides[name]) {
        _.merge(mapping, mappingOverrides[name]);
      }

      return mapping;
    };
  };
});
