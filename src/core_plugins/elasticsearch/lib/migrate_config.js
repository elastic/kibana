import upgrade from './upgrade_config';
import { mappings } from './kibana_index_mappings';

module.exports = function (server) {
  const config = server.config();
  const client = server.plugins.elasticsearch.client;
  const options =  {
    index: config.get('kibana.index'),
    type: 'config',
    body: {
      size: 1000,
      sort: [
        {
          buildNum: {
            order: 'desc',
            unmapped_type: mappings.config.properties.buildNum.type
          }
        }
      ]
    }
  };

  return client.search(options).then(upgrade(server));
};
