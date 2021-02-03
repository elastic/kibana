/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { first, last } from 'rxjs/operators';

export function firstValueFrom<T>(source: Observable<T>) {
  // we can't use SafeSubscriber the same way that RxJS 7 does, so instead we
  return source.pipe(first()).toPromise();
}

export function lastValueFrom<T>(source: Observable<T>) {
  return source.pipe(last()).toPromise();
}
