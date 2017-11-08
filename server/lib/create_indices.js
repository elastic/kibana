import * as constants from '../../common/lib/constants';

function createWorkpadType(client, kibanaIndex) {
  const body = {
    properties: {
      [constants.CANVAS_TYPE]: {
        dynamic: false,
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type:  'keyword',
              },
            },
          },
          id: { type: 'keyword', index: false },
          '@timestamp': { type: 'date' },
          '@created': { type: 'date' },
        },
      },
    },
  };

  return client.indices.putMapping({
    index: kibanaIndex,
    type: 'doc',
    body: body,
  });

}

export function createIndices(server) {
  const { getClient } = server.plugins.elasticsearch.getCluster('admin');
  const client = getClient();
  const config = server.config();
  const kibanaIndex = config.get('kibana.index');

  return Promise.all([
    createWorkpadType(client, kibanaIndex),
  ]);
}
