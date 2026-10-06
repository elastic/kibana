/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { InputTimeRange } from './types';
export declare class TimeHistory {
  private history;
  constructor(storage: IStorageWrapper);
  add(time: InputTimeRange): void;
  get(): TimeRange[];
  get$(): import('rxjs').Observable<TimeRange[]>;
}
export type TimeHistoryContract = PublicMethodsOf<TimeHistory>;
