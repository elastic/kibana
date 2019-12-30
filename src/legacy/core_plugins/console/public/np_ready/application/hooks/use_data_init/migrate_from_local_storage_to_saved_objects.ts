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
import { AppDatabase } from '../../app_database';

export interface Dependencies {
  history: History;
  database: AppDatabase;
}

export const shouldMigrate = (history: History) => Boolean(history.getLegacySavedEditorState());

/**
 * This is a special, once-off migration from localStorage to Saved Objects.
 *
 * It should be run every time this application boots to ensure that the user's data is migrated
 * from Browser localStorage to ES Saved Objects.
 */
export async function localStorageToSavedObjects({
  history,
  database,
}: Dependencies): Promise<void> {
  const legacyTextContent = history.getLegacySavedEditorState();

  if (!legacyTextContent) return;

  await database.text.create({
    userId: 'n',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    text: legacyTextContent.content,
  });

  history.deleteLegacySavedEditorState();
}
