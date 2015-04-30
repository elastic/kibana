define(function (require) {
  return function contentTypesProvider(highlightFilter) {
    var _ = require('lodash');
    var angular = require('angular');

    var types = {
      html: function (format, convert) {
        return function recurse(value, field, hit) {
          var type = typeof value;

          if (type === 'object' && typeof value.map === 'function') {
            if (value.$$_formattedField) return value.$$_formattedField;

            var subVals = value.map(recurse);
            var useMultiLine = subVals.some(function (sub) {
              return sub.indexOf('\n') > -1;
            });

            return value.$$_formattedField = subVals.join(',' + (useMultiLine ? '\n' : ' '));
          }

          return convert.call(format, value, field, hit);
        };
      },

      text: function (format, convert) {
        return function recurse(value) {
          if (value && typeof value.map === 'function') {
            return angular.toJson(value.map(recurse), true);
          }

          return _.escape(convert.call(format, value));
        };
      }
    };

    function fallbackText(value) {
      return _.escape(_.asPrettyString(value));
    }

    function fallbackHtml(value, field, hit) {
      var formatted = this.convert(value, 'text');

      if (!hit || !hit.highlight || !hit.highlight[field.name]) {
        return formatted;
      } else {
        return highlightFilter(formatted, hit.highlight[field.name]);
      }
    }

    function setup(format) {
      var src = format._convert || {};
      var converters = format._convert = {};

      converters.text = types.text(format, src.text || fallbackText);
      converters.html = types.html(format, src.html || fallbackHtml);

      return format._convert;
    }

    return {
      types: types,
      setup: setup
    };
  };
});
