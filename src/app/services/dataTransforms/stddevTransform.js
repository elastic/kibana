define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('stddevTransform', function(dataTransform) {
      this.transform = function(results, fieldName, upperBound, lowerBound, precision, as) {
        var i, sum = 0, mean, stddev, sortedData = _.clone(results.hits),
          dataLength = sortedData.length, upperBound = upperBound || 1,
          lowerBound = lowerBound || 0, precision = precision || 0, as = as || null;

        dataTransform.sort(sortedData, function(hit) {
          return dataTransform.getField(hit, fieldName);
        });

        // start and stop point in loop
        upperBound = Math.floor(upperBound * dataLength);
        lowerBound = Math.ceil(lowerBound * dataLength);

        for (i = lowerBound; i < upperBound; i++) {
          var field = parseFloat(dataTransform.getField(sortedData[i], fieldName));

          if (_.isNumber(field)) {
            sum += field;
          }
        }

        mean = sum / (upperBound - lowerBound);

        sum = 0;
        for (i = lowerBound; i < upperBound; i++) {
          var field = parseFloat(dataTransform.getField(sortedData[i], fieldName));

          if (_.isNumber(field)) {
            sum += Math.pow(field - mean, 2);
          }
        }

        stddev = Math.sqrt(sum / (upperBound - lowerBound));

        precision = Math.pow(10, precision);
        stddev = Math.round(stddev * precision) / precision;

        return [as, stddev];
      };
    });
  }
);
