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
import { SavedObjectsRawDoc, SavedObjectsSerializer } from '../../serialization';
import { TransformFn } from './document_migrator';
import { SavedObjectsMigrationLogger } from '.';
import { defaultMapping } from './build_active_mappings';

/**
 * Applies the specified migration function to every saved object document in
 * the list of raw docs.
 *
 * If the raw document is corrupt or migrating the document fails:
 *   1. Serialize the doc as unsafe to prevent write errors due to a mapping
 *      mismatch. This also marks the document with status = 'invalid' |
 *      'corrupt' which will exclude it from future migrations.
 *   2. Set a special invalid migration version number, so that future versions
 *      of Kibana can possibly attempt to recover this doc.
 *
 * @param {TransformFn} migrateDoc
 * @param {SavedObjectsRawDoc[]} rawDocs
 * @returns {SavedObjectsRawDoc[]}
 */
export function migrateRawDocs(
  serializer: SavedObjectsSerializer,
  migrateDoc: TransformFn,
  rawDocs: SavedObjectsRawDoc[],
  logger: SavedObjectsMigrationLogger,
  kibanaVersion: string
): SavedObjectsRawDoc[] {
  return rawDocs.map((raw) => {
    // corrupt - unable to deserialize due to missing type field, id doesn't match type / namespace fields
    // invalid:type - can serialize but cannot apply migration function

    if (!serializer.isRawSavedObject(raw)) {
      logger.warn('marking object as corrupt please contact support');
      return sanitizeUnsafeRawDoc(raw, kibanaVersion, 'corrupt');
    }

    try {
      const savedObject = serializer.rawToSavedObject(raw);
      savedObject.migrationVersion = savedObject.migrationVersion || {};

      const migrated = migrateDoc(savedObject);
      return serializer.savedObjectToRaw({
        references: [],
        ...migrated,
      });
    } catch (err) {
      logger.warn('marking object as invalid please contact support');
      return sanitizeUnsafeRawDoc(raw, kibanaVersion, 'invalid');
    }
  });
}

// TODO: Does this belong in the serialization layer?
/**
 * When we can't serialize corrupt documents or can't migrate invalid
 * documents we can't guarantee that their fields match the mappings in the
 * saved objects index. This function transforms unsafe documents into a
 * format that's safe to persist by doing the following:
 *   1. To prevent indexing errors we move all but the rootProperties out of
 *      _source and into _source.unsafeProperties
 *   2. We set the status root property to 'invalid' or 'corrupt' to prevent
 *      this document from triggering future migrations.
 * @param raw
 * @param kibanaVersion
 * @param failureReason
 */
function sanitizeUnsafeRawDoc(
  raw: SavedObjectsRawDoc,
  kibanaVersion: string,
  failureReason: 'invalid' | 'corrupt'
) {
  const invalidMigrationVersionType =
    failureReason === 'corrupt' ? '_corrupt' : '_invalid:' + raw._source.type;

  const rootProperties = Object.keys(defaultMapping().properties);

  let safeRawSource: SavedObjectsRawDoc['_source'] = Object.keys(raw._source).reduce(
    (acc, key) => {
      if (rootProperties.includes(key)) {
        acc[key] = raw._source[key];
      } else {
        acc.unsafe_properties[key] = raw._source[key];
      }

      return acc;
    },
    { unsafe_properties: {} } as any
  );

  safeRawSource = {
    ...safeRawSource,
    ...{
      status: failureReason,
      migrationVersion: {
        ...safeRawSource.migrationVersion,
        ...{ [invalidMigrationVersionType]: kibanaVersion },
      },
    },
  };

  return {
    ...raw,
    ...{
      _source: safeRawSource,
    },
  };
}
