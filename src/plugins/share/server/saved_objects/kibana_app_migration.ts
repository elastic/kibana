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

import { SavedObjectMigrationFn } from 'kibana/server';

/**
 * To avoid loading the client twice for old short urls pointing to the /app/kibana app,
 * this PR rewrites them to point to the new platform app url_migrate instead. This app will
 * migrate the url on the fly and redirect the user to the actual new location of the short url
 * without loading the page again.
 * @param doc
 */
export const migrateLegacyKibanaAppShortUrls: SavedObjectMigrationFn<any, any> = (doc) => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    url:
      typeof doc.attributes.url === 'string' && doc.attributes.url.startsWith('/app/kibana')
        ? doc.attributes.url.replace('/app/kibana', '/app/url_migrate')
        : doc.attributes.url,
  },
});
