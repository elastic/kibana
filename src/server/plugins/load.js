module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var resolve = require('bluebird').resolve;
  var inspect = require('util').inspect;

  var Plugins = require('./Plugins');
  var plugins = kbnServer.plugins = new Plugins(kbnServer);
  var path = [];

  return resolve(kbnServer.pluginPaths)
  .map(function (path) {
    return plugins.load(path);
  })
  .then(function () {
    var others = _.indexBy(plugins, 'id');

    return Promise.all(plugins.map(function recurse(plugin) {
      if (_.includes(path, plugin.id)) {
        throw new Error(`circular dependencies found: "${path.concat(plugin.id).join(' -> ')}"`);
      }

      path.push(plugin.id);

      var preInits = _.map(plugin.requiredIds, function (id) {
        if (!others[id]) throw new Error(`Unmet requirement "${id}" for plugin "${plugin.id}"`);
        return recurse(others[id]);
      });
      var promise = Promise.all(preInits).then(_.bindKey(plugin, 'init'));

      path.pop();

      return promise;
    }));
  });
};
