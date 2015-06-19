var Promise = require('bluebird');
module.exports = function (plugin) {
  if (plugin.publicPath) {
    plugin.server.route({
      config: {
        id: plugin.name + ':public'
      },
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
