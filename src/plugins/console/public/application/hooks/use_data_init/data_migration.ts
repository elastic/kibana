/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { History } from '../../../services';
import { ObjectStorageClient } from '../../../../common/types';

export interface Dependencies {
  history: History;
  objectStorageClient: ObjectStorageClient;
}

/**
 * Once off migration to new text object data structure
 */
export async function migrateToTextObjects({
  history,
  objectStorageClient: objectStorageClient,
}: Dependencies): Promise<void> {
  const legacyTextContent = history.getLegacySavedEditorState();

  if (!legacyTextContent) return;

  await objectStorageClient.text.create({
    createdAt: Date.now(),
    updatedAt: Date.now(),
    text: legacyTextContent.content,
  });

  history.deleteLegacySavedEditorState();
}
