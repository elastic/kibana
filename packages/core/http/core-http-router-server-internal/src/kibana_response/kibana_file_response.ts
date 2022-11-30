/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaFileResponseOptions } from '@kbn/core-http-server';
import { KibanaResponse } from './kibana_response';

/**
 * A response payload that represents a request for a specific file
 * @internal
 */
export class KibanaFileResponse extends KibanaResponse<undefined> {
  constructor(
    public readonly path: string,
    public readonly options: KibanaFileResponseOptions = {}
  ) {
    super(0, undefined, options);
  }
}
