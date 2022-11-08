/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FileKind } from './types';

const id = 'baseFileKind' as const;
const tags: string[] = [];
const tenMebiBytes = 1024 * 1024 * 10;

/**
 * A file kind that is available to all plugins to use.
 *
 * @note this file kind has no access controls and so creating a file of this
 * kind is visible to all Kibana users.
 */
export const baseFileKind: FileKind = {
  id,
  maxSizeBytes: tenMebiBytes,
  blobStoreSettings: {},
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
