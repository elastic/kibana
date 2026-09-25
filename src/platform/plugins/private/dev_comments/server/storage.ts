/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { types, type IndexStorageSettings } from '@kbn/storage-adapter';

/** Only queried fields are mapped; anchors are stored verbatim so the UI can evolve their shape without reindexing. */
export const COMMENTS_STORAGE = {
  name: '.kibana_dev_comments',
  schema: {
    properties: {
      createdAt: types.date(),
      updatedAt: types.date(),
      author: types.object({
        properties: { username: types.keyword(), displayName: types.keyword() },
      }),
      text: types.text(),
      resolved: types.boolean(),
      replies: types.object({ enabled: false }),
      route: types.object({
        properties: { pageKey: types.keyword(), path: types.keyword({ index: false }) },
      }),
      anchor: types.object({ enabled: false }),
      trail: types.object({ enabled: false }),
      // The size of the screenshot, which the list shows; the image is a
      // document of SNAPSHOTS_STORAGE under the comment's id, read on its own.
      snapshot: types.object({
        properties: { mimeType: types.keyword(), width: types.long(), height: types.long() },
      }),
    },
  },
} satisfies IndexStorageSettings;

export const SNAPSHOTS_STORAGE = {
  name: '.kibana_dev_comment_snapshots',
  schema: {
    properties: {
      mimeType: types.keyword(),
      width: types.long(),
      height: types.long(),
      /** Base64; kept, never searched. */
      image: types.text({ index: false }),
    },
  },
} satisfies IndexStorageSettings;
