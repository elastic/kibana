define(function (require) {
  return function contentTypesProvider(highlightFilter) {
    var _ = require('lodash');
    var angular = require('angular');

    var types = {
      html: function (format, convert) {
        return function recurse(value, field, hit) {
          if (!value || typeof value.map !== 'function') {
            return convert.call(format, value, field, hit);
          }

          var subVals = value.map(function (v) {
            return recurse(v, field, hit);
          });
          var useMultiLine = subVals.some(function (sub) {
            return sub.indexOf('\n') > -1;
          });

          return subVals.join(',' + (useMultiLine ? '\n' : ' '));
        };
      },

      text: function (format, convert) {
        return function recurse(value) {
          if (!value || typeof value.map !== 'function') {
            return convert.call(format, value);
          }

          // format a list of values. In text contexts we just use JSON encoding
          return angular.toJson(value.map(recurse), true);
        };
      }
    };

    function fallbackText(value) {
      return _.asPrettyString(value);
    }

    function fallbackHtml(value, field, hit) {
      var formatted = _.escape(this.convert(value, 'text'));

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
