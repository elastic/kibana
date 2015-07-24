var upgrade = require('./upgrade_config');

module.exports = function (server) {
  return function () {
    var config = server.config();
    var client = server.plugins.elasticsearch.client;
    var options =  {
      index: config.get('kibana.index'),
      type: 'config',
      body: {
        size: 1000,
        sort: [ { buildNum: { order: 'desc' } } ]
      }
    };

    return client.search(options).then(upgrade(server));
  };
};


