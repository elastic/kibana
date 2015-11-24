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
      console.log('Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  async function getUrlDoc(urlId) {
    const urlDoc = await new Promise((resolve, reject) => {
      const client = server.plugins.elasticsearch.client;

      client.get({
        index: '.kibana',
        type: 'url',
        id: urlId
      })
      .then(response => {
        resolve(response);
      })
      .catch(err => {
        resolve();
      });
    });

    return urlDoc;
  }

  async function createUrlDoc(url, urlId) {
    const newUrlId = await new Promise((resolve, reject) => {
      const client = server.plugins.elasticsearch.client;

      client.index({
        index: '.kibana',
        type: 'url',
        id: urlId,
        body: {
          url,
          'access-count': 0,
          'create-date': new Date(),
          'access-date': new Date()
        }
      })
      .then(response => {
        resolve(response._id);
      })
      .catch(err => {
        reject(err);
      });
    });

    return newUrlId;
  }

  function createUrlId(url) {
    const urlId = crypto.createHash('md5')
    .update(url)
    .digest('hex');

    return urlId;
  }

  return {
    async generateUrlId(url) {
      const urlId = createUrlId(url);

      const urlDoc = await getUrlDoc(urlId);
      if (urlDoc) return urlId;

      return createUrlDoc(url, urlId);
    },
    async getUrl(urlId) {
      try {
        const urlDoc = await getUrlDoc(urlId);
        updateMetadata(urlId, urlDoc);

        return urlDoc._source.url;
      } catch (err) {
        return '/';
      }
    }
  };
};
