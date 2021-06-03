/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Observable } from 'rxjs';
import type { NewsfeedApiDriver } from './driver';
import type { FetchResult } from '../types';

/**
 * NewsfeedApiDriver variant that never fetches results. This is useful for instances where Kibana is started
 * without any user interaction like when generating a PDF or PNG report.
 */
export class NeverFetchNewsfeedApiDriver implements PublicMethodsOf<NewsfeedApiDriver> {
  shouldFetch(): boolean {
    return false;
  }

  public fetchNewsfeedItems(): Observable<FetchResult> {
    throw new Error('Not implemented!');
  }
}
