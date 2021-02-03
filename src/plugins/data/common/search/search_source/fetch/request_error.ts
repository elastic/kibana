/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { KbnError } from '../../../../../kibana_utils/common';
import { SearchError } from './types';

/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 * @param {Object} resp - optional HTTP response
 */
export class RequestFailure extends KbnError {
  public resp?: SearchResponse<any>;
  constructor(err: SearchError | null = null, resp?: SearchResponse<any>) {
    super(`Request to Elasticsearch failed: ${JSON.stringify(resp || err?.message)}`);

    this.resp = resp;
  }
}
