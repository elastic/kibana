var _ = require('lodash');
var Promise = require('bluebird');
var checkDependencies = require('./check_dependencies');
var status = require('../status');
var addStaticsForPublic = require('./add_statics_for_public');

/**
 * Check to see if there are any circular dependencies for the task tree
 * @param {array} plugins an array of plugins
 * @returns {type} description
 */
function checkForCircularDependency(plugins) {
  var deps = {};
  plugins.forEach(function (task) {
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

  /**
   * Checks to see if all the tasks are completed for an array of dependencies
   * @param {array} tasks  An array of plugin names
   * @returns {boolean} if all the tasks are done this it will return true
   */
  function allDone(tasks) {
    var done = _.keys(results);
    return tasks.every(function (dep) {
      return _.contains(done, dep);
    });
  }

  /**
   * Register a plugin with the Kibana server
   *
   * This includes setting up the status object and setting the reference to
   * the plugin's server
   *
   * @param {object} plugin The plugin to register
   * @returns {Promise}
   */
  function registerPlugin(plugin) {
    var config = server.config();
    return new Promise(function (resolve, reject) {
      var register = function (server, options, next) {
        plugin.server = server;
        plugin.server.expose('self', plugin);
        status.createStatus(plugin);
        Promise.try(plugin.init, [server, options], plugin).nodeify(next);
      };
      register.attributes = { name: plugin.name };
      var options = config.get(plugin.name) || {};
      server.register({ register: register, options: options }, function (err) {
        if (err) return reject(err);
        // Only change the plugin status to green if the intial status has not
        // been updated from yellow - Initializing
        if (plugin.status.message === 'Initializing' && plugin.status.state === 'yellow') {
          plugin.status.green('Ready');
        }
        resolve(plugin);
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
            .then(addStaticsForPublic)
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
