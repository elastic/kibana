define(function (require) {
  var inherits = require('utils/inherits');

  return function IndexPatternFactory(Private) {
    var SavedObject = Private(require('../saved_object/saved_object'));
    var mapper = Private(require('./_mapper'));

    function IndexPattern(id) {
      var pattern = this;
      SavedObject.call(pattern, {
        type: 'index-pattern',

        id: id,

        mapping: {
          title: 'string',
          timeFieldName: 'string',
          fields: 'json'
        },

        defaults: {
          title: id
        },

        afterESResp: function () {
          if (pattern.id) {
            if (pattern.fields) mapper.cache.set(pattern.id, pattern.fields);
            else return pattern.fetchFields();
          }
        },

        searchSource: false
      });

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