/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { FetchResult } from '../types';
import { INewsfeedApiDriver } from './types';

/**
 * NewsfeedApiDriver variant that never fetches results. This is useful for instances where Kibana is started
 * without any user interaction like when generating a PDF or PNG report.
 */
export class NeverFetchNewsfeedApiDriver implements INewsfeedApiDriver {
  shouldFetch(): boolean {
    return false;
  }

  fetchNewsfeedItems(): Observable<FetchResult> {
    throw new Error('Not implemented!');
  }
}
