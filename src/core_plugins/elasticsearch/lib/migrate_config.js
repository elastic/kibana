import upgrade from './upgrade_config';

module.exports = function (server, kbnServer) {
  const config = server.config();
  const { getCombined } = kbnServer.mappings;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const options =  {
    index: config.get('kibana.index'),
    type: 'config',
    body: {
      size: 1000,
      sort: [
        {
          buildNum: {
            order: 'desc',
            unmapped_type: getCombined().config.properties.buildNum.type
          }
        }
      ]
    }
  };

  return callWithInternalUser('search', options).then(upgrade(server));
};
