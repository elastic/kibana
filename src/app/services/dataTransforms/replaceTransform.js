define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('replaceTransform', function(dataTransform) {
      this.transform = function(results, search, replace) {
        var regex = dataTransform.parseRegex(search);

        _.forEach(results.hits, function(hit) {
          hit._source['@message'] = hit._source['@message'].replace(regex, replace);
        });

        return results.hits;
      };
    });
  }
);