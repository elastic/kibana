/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * True for paths that stay on the host's origin once resolved: a single leading
 * `/`, so neither `//host/...` (protocol-relative) nor `/\host/...` nor a scheme.
 * Comments may be imported from anywhere, so their paths are checked before use.
 */
export const isSafeRelativePath = (path: string): boolean => /^\/(?![/\\])/.test(path);
