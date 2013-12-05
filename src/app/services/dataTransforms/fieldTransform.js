define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('fieldTransform', function(dataTransform) {
      this.transform = function(hits, search, fieldName, getAll) {
        var regex = dataTransform.parseRegex(search),
          getAll = getAll || false,
          matches;

        _.forEach(hits, function(hit) {
          matches = hit._source['@message'].match(regex);

          if (matches != null) {
            if (getAll && matches.length > 0) {
              hit._source[fieldName] = matches;
            } else {
              hit._source[fieldName] = matches[0];
            }
          }
        });

        return hits;
      };
    });
  }
);