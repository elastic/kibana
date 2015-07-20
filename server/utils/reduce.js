var _ = require('lodash');
var Promise = require('bluebird');


/**
 * Reduces multiple arrays into a single array using a function
 * @param {Array} args - args[0] must always be a {type: 'seriesList'}
 *
 * - If only arg[0] exists, the seriesList will be reduced to a seriesList containing a single series
 * - If multiple arguments are passed, each argument will be mapped onto each series in the seriesList.

 * @params {Function} fn - Function used to combine points at same index in each array of each series in the seriesList.
 * @return {seriesList}
 */
module.exports = function reduce (args, fn) {
  return Promise.all(args).then(function (args) {

    var seriesList = args.shift();

    if (seriesList.type !== 'seriesList') {
      throw new Error ('reduce requires a seriesList as argument 1');
    }

    var reduced = _.map(seriesList.list, function (series) {
      return _.reduce([series].concat(args), function(destinationObject, argument) {

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

    return {type: 'seriesList', list: reduced};

  }).catch(function (e) {throw e;});
};