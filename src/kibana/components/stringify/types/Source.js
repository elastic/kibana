define(function (require) {
  return function _StringProvider(Private, shortDotsFilter, highlightFilter) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));
    var noWhiteSpace = require('utils/no_white_space');
    var template = _.template(noWhiteSpace(require('text!components/stringify/types/_source.html')));


    _(Source).inherits(FieldFormat);
    function Source(params) {
      var self = this;

      // _source converters are weird and override the _convert object
      // that is setup by the FieldFormat constructor
      Source.prototype._convert = {};

      Source.Super.call(self, params);

      function sourceToText(source) {
        return _.escape(JSON.stringify(source));
      }

      function sourceToHtml(source, indexPattern, hit) {
        if (!indexPattern) return sourceToText(source);
        var highlights = (hit && hit.highlights) || {};

        var formatted = indexPattern.formatHit(hit);
        var highlightPairs = [];
        var sourcePairs = [];

        _.keys(formatted).forEach(function (key) {
          var pairs = sourcePairs;
          var field = shortDotsFilter(key);
          var val = formatted[key];

          if (highlights[key]) {
            pairs = highlightPairs;
            val = highlightFilter(val, highlights[key]);
          }

          pairs.push([field, val]);
        }, []);

        return template({ defPairs: highlightPairs.concat(sourcePairs) });
      }

      self._convert = {
        text: sourceToText,
        html: sourceToHtml
      };
    }

    Source.id = '_source';
    Source.title = '_source';
    Source.fieldType = '_source';

    return Source;
  };
});
