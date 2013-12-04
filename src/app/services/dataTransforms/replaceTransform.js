define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('replaceTransform', function() {
      this.transform = function(hits, search, replace) {
        var regex = new RegExp(search, 'g');

        _.forEach(hits, function(hit) {
          hit._source['@message'] = hit._source['@message'].replace(regex, replace);
        });

        return hits;
      };
    });
  }
);