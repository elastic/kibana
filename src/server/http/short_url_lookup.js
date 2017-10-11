import crypto from 'crypto';
import { get } from 'lodash';

export class ShortUrlLookup {
  constructor(log, savedObjectsClient) {
    this.log = log;
    this.savedObjectsClient = savedObjectsClient;
  }

  async function updateMetadata(doc) {
    try {
      await this.savedObjectsClient.update('url', doc.id, {
        accessDate: new Date(),
        accessCount: get(doc, 'attributes.accessCount', 0) + 1
      });
    } catch (err) {
      this.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  async generateUrlId(url) {
    const id = crypto.createHash('md5').update(url).digest('hex');
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
  }

  async function getUrl(id) {
    const doc = await this.savedObjectsClient.get('url', id);
    updateMetadata(doc);

    return doc.attributes.url;
  }
}
