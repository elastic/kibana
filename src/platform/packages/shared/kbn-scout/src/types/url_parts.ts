/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parsed URL pieces for test server endpoints.
 * Duplicated from @kbn/test `UrlParts` so Scout typings do not import @kbn/test.
 */
export interface UrlParts {
  protocol?: string;
  hostname?: string;
  port?: number;
  auth?: string;
  username?: string;
  password?: string;
}
