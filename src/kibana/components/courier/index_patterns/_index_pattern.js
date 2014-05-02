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
          if (pattern.id && !pattern.fields) {
            return pattern.refreshFields();
          }
        },

        searchSource: false
      });

      pattern.refreshFields = function () {
        return mapper.clearCache(pattern.id)
        .then(function () {
          return mapper.getFieldsForIndexPattern(pattern.id);
        })
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