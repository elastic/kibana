define(function (require) {
  return function IndexPatternFactory(Private) {
    var inherits = require('utils/inherits');
    var SavedObject = Private(require('../saved_object/saved_object'));
    var mapper = Private(require('./_mapper'));
    var fieldFormats = Private(require('./_field_formats'));
    var _ = require('lodash');

    function IndexPattern(id) {
      var pattern = this;
      SavedObject.call(pattern, {
        type: 'index-pattern',

        id: id,

        mapping: {
          title: 'string',
          timeFieldName: 'string',
          customFormats: 'json',
          fields: 'json'
        },

        defaults: {
          title: id,
          customFormats: {}
        },

        afterESResp: function () {
          if (pattern.id) {
            if (!pattern.fields) return pattern.fetchFields();

            mapper.cache.set(pattern.id, pattern.fields);
            afterFieldsSet();
          }
        },

        searchSource: false
      });

      function afterFieldsSet() {
        pattern.fieldsByName = {};
        pattern.fields.forEach(function (field) {
          pattern.fieldsByName[field.name] = field;

          // non-enumerable type so that it does not get included in the JSON
          Object.defineProperty(field, 'format', {
            enumerable: false,
            get: function () {
              var formatName = pattern.customFormats && pattern.customFormats[field.name];
              return formatName ? fieldFormats.byName[formatName] : fieldFormats.defaultByType[field.type];
            }
          });
        });
      }

      pattern.refreshFields = function () {
        return mapper.clearCache(pattern.id)
        .then(function () {
          return pattern.fetchFields();
        });
      };

      pattern.fetchFields = function () {
        return mapper.getFieldsForIndexPattern(pattern.id, true)
        .then(function (fields) {
          pattern.fields = fields;
          afterFieldsSet();
          return pattern.save();
        });
      };

      pattern.toJSON = function () {
        return pattern.id;
      };

      pattern.toString = function () {
        return '' + this.toJSON();
      };
    }
    return IndexPattern;
  };
});