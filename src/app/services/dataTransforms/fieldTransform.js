define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('fieldTransform', function(dataTransform) {
      this.transform = function(results, search, fieldName, returnIndex) {
        var regex = dataTransform.parseRegex(search),
          returnIndex = returnIndex || 0,
          matches;

        _.forEach(results.hits, function(hit) {
          matches = hit._source['@message'].match(regex);

          if (matches != null) {
            hit._source[fieldName] = matches[returnIndex];
          }
        });

        return results.hits;
      };
    });
  }
);