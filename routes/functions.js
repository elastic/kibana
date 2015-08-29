var loadFunctions = require('../lib/load_functions.js');
var functions  = loadFunctions('series_functions/');
var _ = require('lodash');

module.exports = function (request, reply) {
  console.log(functions);
  var functionArray = _.map(functions, function (val, key) {
    // TODO: This won't work on frozen objects, it should be removed when everything is converted to datasources and chainables
    return _.extend({}, val, {name: key});
  });
  reply(functionArray);
};