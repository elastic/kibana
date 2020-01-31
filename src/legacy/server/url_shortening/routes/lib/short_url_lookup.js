/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import crypto from 'crypto';
import { get } from 'lodash';

export function shortUrlLookupProvider(server) {
  async function updateMetadata(doc, req) {
    try {
      await req.getSavedObjectsClient().update('url', doc.id, {
        accessDate: new Date(),
        accessCount: get(doc, 'attributes.accessCount', 0) + 1,
      });
    } catch (err) {
      server.log('Warning: Error updating url metadata', err);
      //swallow errors. It isn't critical if there is no update.
    }
  }

  return {
    async generateUrlId(url, req) {
      const id = crypto
        .createHash('md5')
        .update(url)
        .digest('hex');
      const savedObjectsClient = req.getSavedObjectsClient();
      const { isConflictError } = savedObjectsClient.errors;

      try {
        const doc = await savedObjectsClient.create(
          'url',
          {
            url,
            accessCount: 0,
            createDate: new Date(),
            accessDate: new Date(),
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

    async getUrl(id, req) {
      const doc = await req.getSavedObjectsClient().get('url', id);
      updateMetadata(doc, req);

      return doc.attributes.url;
    },
  };
}
