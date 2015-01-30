var Promise = require('bluebird');
var migrateConfig = require('./migrateConfig');

module.exports = function () {
  var tasks = [
    migrateConfig()
  ];

  return Promise.all(tasks);
};
