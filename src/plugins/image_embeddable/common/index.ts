/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileKind } from '@kbn/files-plugin/common';

export const PLUGIN_ID = 'imageEmbeddable';
export const PLUGIN_NAME = 'Image Embeddable';

const httpTags = {
  // image embeddable used on a dashboard app, hence at least check access to dashboard app
  tags: [`access:dashboards`], // TODO: check this
};

export const imageEmbeddableFileKind: FileKind = {
  id: PLUGIN_ID,
  allowedMimeTypes: [
    'image/png',
    'image/jpg',
    'image/webp',
    'image/avif',
    /* image/svg+xml, */ // TODO: check any edge cases
    /* image/gif, */ // TODO: do we need this?
  ],
  http: {
    create: httpTags,
    delete: httpTags,
    download: httpTags,
    getById: httpTags,
    list: httpTags,
    share: httpTags,
    update: httpTags,
  },
};
