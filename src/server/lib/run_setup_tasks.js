var Promise = require('bluebird');
module.exports = function (server, tasks) {
  return Promise.each(tasks, function (task) {
    return task(server);
  });
};
