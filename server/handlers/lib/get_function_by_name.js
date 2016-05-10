var loadFunctions = require('../../lib/load_functions.js');
var functions  = loadFunctions('series_functions');

module.exports = function getFunctionByName(name) {
  if (!functions[name]) throw new Error ('No such function: ' + name);
  return functions[name];
};
