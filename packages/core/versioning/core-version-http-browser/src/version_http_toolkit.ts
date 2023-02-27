/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';

/** A number > 0. */
export type Version = `${number}`;

export interface CreateClientArgs {
  version: Version;
}

/** @experimental */
export interface VersionHTTPToolkit {
  /**
   * Create a new HTTP client for a specific version.
   * @experimental
   */
  createClient: (arg: CreateClientArgs) => HttpSetup;
}
