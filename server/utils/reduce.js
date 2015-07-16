var _ = require('lodash');
var Promise = require('bluebird');


/**
 * Reduces multiple arrays into a single array using a function
 * @param {Array} arrayOfArrays - An array of series to reduce into a single series.
 * @params {Function} fn - Function used to combine points at same index in each array
 * @return {Array} A single series as modified by the fn
 */
module.exports = function reduce (arrayOfArrays, fn) {
  return Promise.all(arrayOfArrays).then(function (arrayOfArrays) {
    return _.reduce(arrayOfArrays, function(destinationObject, argument) {

      var output = _.map(destinationObject.data, function (point, index) {


        var value = point[1];


        if (value == null) {
          return [point[0], null];
        }

        if (_.isNumber(argument)) {
          return [point[0], fn(value, argument)];
        }

        if (argument.data[index][1] == null) {
          return [point[0], null];
        }
        return [point[0], fn(value, argument.data[index][1])];
      });

      // Output = single series

      output = {
        data: output
      };
      output = _.defaults(output, destinationObject);
      return output;

    });
  });
};