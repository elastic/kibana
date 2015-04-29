define(function (require) {
  return function contentTypesProvider() {
    var _ = require('lodash');
    var angular = require('angular');

    var types = {
      html: function (format, convert) {
        return function recurse(value) {
          var type = typeof value;

          if (type === 'object' && typeof value.map === 'function') {
            if (value.$$_formattedField) return value.$$_formattedField;

            var subVals = value.map(recurse);
            var useMultiLine = subVals.some(function (sub) {
              return sub.indexOf('\n') > -1;
            });

            return value.$$_formattedField = subVals.join(',' + (useMultiLine ? '\n' : ' '));
          }

          return convert.call(format, value);
        };
      },

      text: function (format, convert) {
        return function recurse(value) {
          if (value && typeof value.map === 'function') {
            return angular.toJson(value.map(recurse));
          }

          return _.escape(convert.call(format, value));
        };
      }
    };

    function setup(format) {
      var src = format._convert || {};
      var converters = format._convert = {};

      if (src.text) {
        converters.text = types.text(format, src.text);
      } else {
        converters.text = types.text(format, _.escape);
      }

      if (src.html) {
        converters.html = types.html(format, src.html);
      } else {
        converters.html = types.html(format, converters.text);
      }

      return format._convert;
    }

    return {
      types: types,
      setup: setup
    };
  };
});
