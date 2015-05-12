var Promise = require('bluebird');
module.exports = function (plugin) {
  if (plugin.publicPath) {
    plugin.server.route({
      method: 'GET',
      path: '/' + plugin.name + '/{paths*}',
      handler: {
        directory: {
          path: plugin.publicPath
        }
      }
    });
  }
  return Promise.resolve(plugin);
};
