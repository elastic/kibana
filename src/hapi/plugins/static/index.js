var kibana = require('../../');

module.exports = new kibana.Plugin({
  init: function (server, options) {
    var config = server.config();
    server.route({
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: config.get('kibana.publicFolder')
        }
      }
    });
  }
});
