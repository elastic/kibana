define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('meanTransform', function(dataTransform) {
      this.transform = function(results, fieldName, upperBound, lowerBound, as) {
        var i, sum = 0, mean, sortedData = _.clone(results.hits),
          dataLength = sortedData.length, upperBound = upperBound || 1,
          lowerBound = lowerBound || 0, as = as || null;

        dataTransform.sort(sortedData, function(hit) {
          return dataTransform.getField(hit, fieldName);
        });

        // start and stop point in loop
        upperBound = Math.floor(upperBound * dataLength);
        lowerBound = Math.ceil(lowerBound * dataLength);

        for (i = lowerBound; i <= upperBound; i++) {
          var field = parseFloat(dataTransform.getField(sortedData[i], fieldName));

          if (_.isNumber(field)) {
            sum += field;
          }
        }

        mean = Math.round((sum / (upperBound - lowerBound + 1)) * 10) / 10;

        return [as, mean];
      };
    });
  }
);
