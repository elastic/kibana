import upgrade from './upgrade_config';

module.exports = function (server) {
  const config = server.config();
  const client = server.plugins.elasticsearch.client;
  const options =  {
    index: config.get('kibana.index'),
    type: 'config',
    body: {
      size: 1000,
      sort: [ { buildNum: { order: 'desc', ignore_unmapped: true } } ]
    }
  };

  return client.search(options).then(upgrade(server));
};


