import upgrade from './upgrade_config';

module.exports = function (server) {
  const config = server.config();
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const { getCombined } = server.plugins.elasticsearch.mappings;
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
