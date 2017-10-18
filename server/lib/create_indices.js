import * as constants from '../../common/lib/constants';

function createWorkpadIndex(client, indexPrefix) {
  const indexName = `${indexPrefix}${constants.INDEX_WORKPAD_SUFFIX}`;
  const indexBody = {
    settings: {
      index: {
        number_of_shards: 1,
        number_of_replicas: 0,
        mapper: {
          dynamic: false,
        },
      },
    },
    mappings : {
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

  return client.indices.exists({
    index: indexName,
  })
  .then((exists) => {
    if (exists) return true;

    return client.indices.create({
      index: indexName,
      body: indexBody,
    });
  });
}

export function createIndices(server) {
  const { getClient } = server.plugins.elasticsearch.getCluster('admin');
  const client = getClient();
  const config = server.config();
  const indexPrefix = config.get('canvas.indexPrefix');

  return Promise.all([
    createWorkpadIndex(client, indexPrefix),
  ]);
}
