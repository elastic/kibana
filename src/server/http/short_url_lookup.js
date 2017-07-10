import { get } from 'lodash';

export default function (server) {
  async function updateMetadata(doc, req) {
    try {
      await req.savedObjectsClient.update('url', doc.id, {
        accessDate: new Date(),
        accessCount: get(doc, 'attributes.accessCount', 0) + 1
      });
    } catch (err) {
      server.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  return {
    async generateUrlId(url, req) {
      const response = await req.getSavedObjectsClient().create('url', {
        url,
        accessCount: 0,
        createDate: new Date(),
        accessDate: new Date()
      });

      return response.id;
    },

    async getUrl(id, req) {
      try {
        const doc = await req.getSavedObjectsClient().get('url', id);
        updateMetadata(doc, req);

        return doc.attributes.url;
      } catch (err) {
        return '/';
      }
    }
  };
}
