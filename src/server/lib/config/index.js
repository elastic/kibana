var Config = require('./config');
var schema = require('./schema');
var config = new Config(schema);
module.exports = function () {
  return config;
};
