define(function (require) {
  require('components/highlight/highlight_tags');

  var _ = require('lodash');
  var angular = require('angular');
  var module = require('modules').get('kibana');

  module.filter('highlight', function (highlightTags) {
    return function (formatted, highlight) {
      if (typeof formatted === 'object') formatted = angular.toJson(formatted);

      formatted = _.escape(formatted);

      _.each(highlight, function (section) {
        section = _.escape(section);

        // Strip out the highlight tags to compare against the formatted string
        var untagged = section
          .split(highlightTags.pre).join('')
          .split(highlightTags.post).join('');

        // Replace all highlight tags with proper html tags
        var tagged = section
          .split(highlightTags.pre).join('<mark>')
          .split(highlightTags.post).join('</mark>');

        // Replace all instances of the untagged string with the properly tagged string
        formatted = formatted.split(untagged).join(tagged);
      });

      return formatted;
    };
  });
});