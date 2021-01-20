/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import crypto from 'crypto';
import { get } from 'lodash';

import { Logger, SavedObject, SavedObjectsClientContract } from 'kibana/server';

export interface ShortUrlLookupService {
  generateUrlId(url: string, deps: { savedObjects: SavedObjectsClientContract }): Promise<string>;
  getUrl(url: string, deps: { savedObjects: SavedObjectsClientContract }): Promise<string>;
}

export interface UrlAttributes {
  url: string;
  accessCount: number;
  createDate: number;
  accessDate: number;
}

export function shortUrlLookupProvider({ logger }: { logger: Logger }): ShortUrlLookupService {
  async function updateMetadata(
    doc: SavedObject<UrlAttributes>,
    { savedObjects }: { savedObjects: SavedObjectsClientContract }
  ) {
    try {
      await savedObjects.update<UrlAttributes>('url', doc.id, {
        accessDate: new Date().valueOf(),
        accessCount: get(doc, 'attributes.accessCount', 0) + 1,
      });
    } catch (error) {
      logger.warn('Warning: Error updating url metadata');
      logger.warn(error);
      // swallow errors. It isn't critical if there is no update.
    }
  }

  return {
    async generateUrlId(url, { savedObjects }) {
      const id = crypto.createHash('md5').update(url).digest('hex');
      const { isConflictError } = savedObjects.errors;

      try {
        const doc = await savedObjects.create<UrlAttributes>(
          'url',
          {
            url,
            accessCount: 0,
            createDate: new Date().valueOf(),
            accessDate: new Date().valueOf(),
          },
          { id }
        );

        return doc.id;
      } catch (error) {
        if (isConflictError(error)) {
          return id;
        }

        throw error;
      }
    },

    async getUrl(id, { savedObjects }) {
      const doc = await savedObjects.get<UrlAttributes>('url', id);
      updateMetadata(doc, { savedObjects });

      return doc.attributes.url;
    },
  };
}
