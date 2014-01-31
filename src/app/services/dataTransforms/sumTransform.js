define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('sumTransform', function(dataTransform) {
      this.transform = function(results, fieldName) {
        var sum = 0;
        _.forEach(results.hits, function(hit) {
          var field = parseFloat(dataTransform.getField(hit, fieldName));

          if (!_.isNaN(field)) {
            sum += field;
          }
        });

        results.calc.sum = sum;
        return results.hits;
      };
    });
  }
);