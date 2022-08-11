/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObservableInput } from 'rxjs';

export type IterableInput<T> = Iterable<T> | ObservableInput<T>;
export type AsyncMapResult<T> = Promise<T> | ObservableInput<T>;
export type AsyncMapFn<T1, T2> = (item: T1, i: number) => AsyncMapResult<T2>;
