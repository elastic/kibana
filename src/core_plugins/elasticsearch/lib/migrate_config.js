import { get } from 'lodash';
import upgrade from './upgrade_config';

module.exports = function (server, { mappings }) {
  const config = server.config();
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
            unmapped_type: get(mappings, 'config.properties.buildNum.type') || 'keyword'
          }
        }
      ]
    }
  };

  return callWithInternalUser('search', options).then(upgrade(server));
};
