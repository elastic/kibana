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

import { History } from '../../../services';
import { LocalObjectStorage } from '../../../lib/local_storage_object_client';
import { ObjectStorageClient } from '../../../types';

export interface Dependencies {
  history: History;
  objectStorageClient: ObjectStorageClient;
  /**
   * The ability to store Console text in Saved Objects came after
   * first data migration. So we went:
   *
   * Legacy Data -> New Data Shape -> Wipe old data.
   *
   * We used the presence of legacy data to kick off this process. However,
   * now that we have another adapter that enables storing data in Saved Objects
   * potentially (i.e. outside localStorage when security is available) the updated
   * migration path we want to enable is:
   *
   * Legacy Data -> New Data Shape + potentially saved objects (remotely).
   *
   * There are a subset of users that had the first migration path run who will be running
   * Kibana with x-pack security enabled. For these users we specifically check if we should
   * migrate them to saved objects.
   *
   * We do this automatically for now, but probably should remove this behaviour before 7.7 release
   */
  localObjectStorageMigrationClient: ObjectStorageClient;
}

export async function migrateToTextObjects({
  history,
  objectStorageClient: objectStorageClient,
  localObjectStorageMigrationClient,
}: Dependencies): Promise<void> {
  const legacyTextContent = history.getLegacySavedEditorState();

  if (legacyTextContent) {
    await objectStorageClient.text.create({
      createdAt: Date.now(),
      updatedAt: Date.now(),
      text: legacyTextContent.content,
    });

    history.deleteLegacySavedEditorState();
    return;
  }

  if (!(objectStorageClient.text instanceof LocalObjectStorage)) {
    const localObjects = await localObjectStorageMigrationClient.text.findAll();

    if (!localObjects?.length) {
      return;
    }

    for (const { createdAt, updatedAt, text } of localObjects) {
      await objectStorageClient.text.create({
        createdAt,
        updatedAt,
        text,
      });
    }

    (localObjectStorageMigrationClient.text as LocalObjectStorage<any>).deleteLocallyStoredState();
  }
}
