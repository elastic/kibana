/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnError } from '@kbn/kibana-utils-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { SearchError } from './types';

/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 * @param {Object} resp - optional HTTP response
 */
export class RequestFailure extends KbnError {
  public resp?: IKibanaSearchResponse;
  constructor(err: SearchError | null = null, resp?: IKibanaSearchResponse) {
    super(`Request to Elasticsearch failed: ${JSON.stringify(resp?.rawResponse || err?.message)}`);

    this.resp = resp;
  }
}
