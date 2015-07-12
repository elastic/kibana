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

      var output = _.mapValues(destinationObject.data, function (value, key) {
        // Allow function to take 2 arrays of equal length, OR an array and a single number;
        // null points are not drawn
        if (value == null) {
          return null;
        }

        if (_.isNumber(argument)) {
          return fn(value, argument);
        }

        if (argument.data[key] == null) {
          return null;
        }

        return fn(value, argument.data[key]);
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