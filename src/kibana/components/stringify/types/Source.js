define(function (require) {
  return function _SourceProvider(Private, shortDotsFilter) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));
    var noWhiteSpace = require('utils/no_white_space');
    var template = _.template(noWhiteSpace(require('text!components/stringify/types/_source.html')));
    var angular = require('angular');

    _(Source).inherits(FieldFormat);
    function Source(params) {
      Source.Super.call(this, params);
    }

    Source.id = '_source';
    Source.title = '_source';
    Source.fieldType = '_source';

    Source.prototype._convert = {
      text: angular.toJson,
      html: function sourceToHtml(source, field, hit) {
        if (!field) return this.getConverter('text')(source, field, hit);

        var highlights = (hit && hit.highlight) || {};
        var formatted = field.indexPattern.formatHit(hit);
        var highlightPairs = [];
        var sourcePairs = [];

        _.keys(formatted).forEach(function (key) {
          var pairs = highlights[key] ? highlightPairs : sourcePairs;
          var field = shortDotsFilter(key);
          var val = formatted[key];
          pairs.push([field, val]);
        }, []);

        return template({ defPairs: highlightPairs.concat(sourcePairs) });
      }
    };

    return Source;
  };
});
