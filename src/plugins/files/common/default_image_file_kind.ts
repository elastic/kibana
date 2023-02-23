/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FileKind } from './types';

const id = 'defaultImage' as const;
const tag = 'files:defaultImage' as const;
const tags = [`access:${tag}`];
const tenMebiBytes = 1024 * 1024 * 10;

/**
 * A file kind that is available to all plugins to use for uploading images
 * intended to be reused across Kibana.
 */
export const defaultImageFileKind: FileKind = {
  id,
  maxSizeBytes: tenMebiBytes,
  blobStoreSettings: {},
  // tried using "image/*" but it did not work with the HTTP endpoint (got 415 Unsupported Media Type)
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
  http: {
    create: { tags },
    delete: { tags },
    download: { tags },
    getById: { tags },
    list: { tags },
    share: { tags },
    update: { tags },
  },
};
