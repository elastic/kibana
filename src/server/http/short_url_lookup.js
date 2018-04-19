import crypto from 'crypto';
import { get } from 'lodash';

export function shortUrlLookupProvider(server) {
  async function updateMetadata(doc, req) {
    try {
      await req.getSavedObjectsClient().update('url', doc.id, {
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
      const id = crypto.createHash('md5').update(url).digest('hex');
      const savedObjectsClient = req.getSavedObjectsClient();
      const { isConflictError } = savedObjectsClient.errors;

      try {
        const doc = await savedObjectsClient.create('url', {
          url,
          accessCount: 0,
          createDate: new Date(),
          accessDate: new Date()
        }, { id });

        return doc.id;
      } catch (error) {
        if (isConflictError(error)) {
          return id;
        }

        throw error;
      }
    },

    async getUrl(id, req) {
      const doc = await req.getSavedObjectsClient().get('url', id);
      updateMetadata(doc, req);

      return doc.attributes.url;
    }
  };
}
