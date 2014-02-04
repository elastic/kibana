define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('divideTransform', function(dataTransform) {
      this.transform = function(results, numerator, denominator, precision, as) {
        var quotient, precision = precision || 0, as = as || null;

        numerator = _.isNumber(numerator) ? numerator : dataTransform.getCalc(results.calc, numerator);
        denominator = _.isNumber(denominator) ? denominator : dataTransform.getCalc(results.calc, denominator);

        precision = Math.pow(10, precision);
        quotient = Math.round((numerator / denominator) * precision) / precision;

        return [as, quotient];
      };
    });
  }
);
