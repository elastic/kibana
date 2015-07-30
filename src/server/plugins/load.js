'use strict';

module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let resolve = require('bluebird').resolve;
  let all = require('bluebird').all;
  let attempt = require('bluebird').attempt;

  var Plugins = require('./Plugins');
  var plugins = kbnServer.plugins = new Plugins(kbnServer);

  let path = [];
  let step = function (id, block) {
    return resolve(id)
    .then(function (id) {
      if (_.includes(path, id)) {
        throw new Error(`circular dependencies found: "${path.concat(id).join(' -> ')}"`);
      }

      path.push(id);
      return block();
    })
    .then(function () {
      path.pop(id);
    });
  };

  return resolve(kbnServer.pluginPaths)
  .map(function (path) {
    return plugins.new(path);
  })
  .then(function () {
    if (!config.get('plugins.initialize')) {
      server.log(['info'], 'Plugin initialization disabled.');
      return [];
    }

    return _.toArray(plugins);
  })
  .each(function loadReqsAndInit(plugin) {
    return step(plugin.id, function () {
      return resolve(plugin.requiredIds).map(function (reqId) {
        if (!plugins.byId[reqId]) {
          throw new Error(`Unmet requirement "${reqId}" for plugin "${plugin.id}"`);
        }

        return loadReqsAndInit(plugins.byId[reqId]);
      })
      .then(function () {
        return plugin.init();
      });
    });
  });
};
