var loadFunctions = require('../lib/load_functions.js');
var functions  = loadFunctions('series_functions/');
var _ = require('lodash');

module.exports = function (request, reply) {
  var functionArray = _.map(functions, function (val, key) {
    return _.merge({name: key}, val);
  });
  reply(functionArray);
};