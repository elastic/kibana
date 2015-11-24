const crypto = require('crypto');

export default function (server) {
  async function updateMetadata(urlId, urlDoc) {
    const client = server.plugins.elasticsearch.client;

    try {
      await client.update({
        index: '.kibana',
        type: 'url',
        id: urlId,
        body: {
          doc: {
            'access-date': new Date(),
            'access-count': urlDoc._source['access-count'] + 1
          }
        }
      });
    } catch (err) {
      console.log(err);
      //swallow errors. We don't care if there is no update.
    }
  }

  return {
    async generateUrlId(url) {
      const urlId = await new Promise((resolve, reject) => {
        const client = server.plugins.elasticsearch.client;

        // const urlId = crypto.createHash('md5')
        // .update(url)
        // .digest('hex');

        client.index({
          index: '.kibana',
          type: 'url',
          body: {
            url,
            'access-count': 0,
            'create-date': new Date(),
            'access-date': new Date()
          }
        })
        .then(response => {
          const urlId = response._id;
          resolve(urlId);
        })
        .catch(err => {
          reject(err);
        });
      });

      return urlId;
    },
    async getUrl(urlId) {
      const url = await new Promise((resolve, reject) => {
        const client = server.plugins.elasticsearch.client;

        client.get({
          index: '.kibana',
          type: 'url',
          id: urlId
        })
        .then(response => {
          const url = response._source.url;
          updateMetadata(urlId, response);
          resolve(url);
        })
        .catch(err => {
          resolve('/');
        });
      });

      return url;
    }
  };
};
