var Promise = require('bluebird');
var _ = require('lodash');

/* @param {Array} args
 * - args[0] must be a seriesList

 * @params {Function} fn - Function used to combine points at same index in each array of each series in the seriesList.
 * @return {seriesList}
 */

module.exports = function alter (args, fn) {
  return Promise.all(args).then(function (args) {

    var seriesList = args.shift();

    if (seriesList.type !== 'seriesList') {
      throw new Error ('args[0] must be a seriesList');
    }

    var list = _.chain(seriesList.list).map(function (series) {
      return fn([series].concat(args));
    }).flatten().value();

    return {type: 'seriesList', list: list};
  }).catch(function (e) {throw e;});
};