/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FileKindBase } from '@kbn/shared-ux-file-types';

export const id = 'defaultImage' as const;
export const tag = 'files:defaultImage' as const;
export const tags = [`access:${tag}`];
export const maxSize = 1024 * 1024 * 10;

export const kind: FileKindBase = {
  id,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
};
