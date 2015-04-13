var _ = require('lodash');
var Promise = require('bluebird');
var checkDependencies = require('./check_dependencies');
var systemStatus = require('./system_status');

function checkForCircularDependency(tasks) {
  var deps = {};
  tasks.forEach(function (task) {
    deps[task.name] = [];
    if (task.require) deps[task.name] = task.require;
  });
  return _(deps).keys().map(function (task) {
    return checkDependencies(task, deps);
  }).every(function (result) {
    return result;
  });
}

module.exports = function (server, plugins) {
  var total = plugins.length;
  var results = {};
  var running = {};
  var finished = false;
  var todo = plugins.concat();

  function allDone(tasks) {
    var done = _.keys(results);
    return tasks.every(function (dep) {
      return _.contains(done, dep);
    });
  }

  function registerPlugin(plugin) {
    var config = server.config();
    return new Promise(function (resolve, reject) {
      var register = function (server, options, next) {
        plugin.server = server;
        systemStatus.createStatus(plugin);
        plugin.status.yellow('Initializing');
        Promise.try(plugin.init, [server, options], plugin).nodeify(next);
      };
      register.attributes = { name: plugin.name };
      var options = config[plugin.name] || {};
      server.register({ register: register, options: options }, function (err) {
        if (err) return reject(err);
        resolve();
        plugin.status.green('Ready');
      });
    });
  }

  return new Promise(function (resolve, reject) {
    // Check to see if we have a circular dependency
    if (checkForCircularDependency(plugins)) {
      (function runPending() {
        plugins.forEach(function (plugin) {
          // The running tasks are the same length as the results then we are
          // done with all the plugin initalization tasks
          if (_.keys(results).length === total) return resolve(results);
          // If the current plugin is done or running the continue to the next one
          if (results[plugin.name] || running[plugin.name]) return;
          // If the current plugin doesn't have dependencies or all the dependencies
          // are fullfilled then try running the plugin.
          if (!plugin.require || (plugin.require && allDone(plugin.require))) {
            running[plugin.name] = true;
            registerPlugin(plugin)
            .then(function () {
              results[plugin.name] = true;
              runPending();
            }).catch(reject);
          }
        });
      })();
    }
  });
};
