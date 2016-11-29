var Promise = require('bluebird');
var _ = require('lodash');

/* @param {Array} args
 * - args[0] must be a seriesList

 * @params {Function} fn - Function to apply to each series in the seriesList
 * @return {seriesList}
 */

module.exports = function alter(args, fn) {
  // In theory none of the args should ever be promises. This is probably a waste.
  return Promise.all(args).then(function (args) {

    var seriesList = args.shift();

    if (seriesList.type !== 'seriesList') {
      throw new Error ('args[0] must be a seriesList');
    }

    var list = _.chain(seriesList.list).map(function (series) {
      return fn.apply(this, [series].concat(args));
    }).flatten().value();

    seriesList.list = list;
    return seriesList;
  }).catch(function (e) {
    throw e;
  });
};
