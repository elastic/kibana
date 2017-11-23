import crypto from 'crypto';
import { get } from 'lodash';
import { shortUrlAssertValid } from './short_url_assert_valid';

import {
  SavedObjectsService,
  Logger,
} from '@elastic/kbn-types';

export class ShortUrlService {
  constructor(
    private readonly log: Logger,
    private readonly savedObjectsService: SavedObjectsService,
  ) {
    this.log = log;
    this.savedObjectsService = savedObjectsService;
  }

  private async updateMetadata(doc) {
    try {
      await this.savedObjectsService.update('url', doc.id, {
        accessDate: new Date(),
        accessCount: get(doc, 'attributes.accessCount', 0) + 1
      });
    } catch (err) {
      this.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  async generateUrlId(url) {
    shortUrlAssertValid(url);

    const id = crypto.createHash('md5').update(url).digest('hex');
    const { isConflictError } = savedObjectsService.errors;

    try {
      const doc = await savedObjectsService.create('url', {
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

  async getUrl(id) {
    const doc = await this.savedObjectsService.get('url', id);
    updateMetadata(doc);

    shortUrlAssertValid(doc.attributes.url);

    return doc.attributes.url;
  }
}
