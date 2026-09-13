/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The `defaultImage` file kind is registered by the files plugin out of the box,
// so tests can create files through it without registering a kind of their own.
export const FILE_KIND = 'defaultImage';

export const FILES_API = {
  CREATE: `/api/files/files/${FILE_KIND}`,
  // Delete is a per-kind route; every file this suite creates is `FILE_KIND`.
  delete: (id: string) => `/api/files/files/${FILE_KIND}/${id}`,
};
