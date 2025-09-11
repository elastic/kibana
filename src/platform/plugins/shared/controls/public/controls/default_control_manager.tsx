/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishesBlockingError, PublishesDataLoading } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';

export type ControlApi = PublishesBlockingError & PublishesDataLoading;

/** TODO: This feels redundant and doesn't actually do much anymore. We should remove it. */
export const initializeDefaultControlManager = () => {
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

  return {
    api: {
      dataLoading$,
      blockingError$,
      setBlockingError: (error: Error | undefined) => blockingError$.next(error),
      setDataLoading: (loading: boolean | undefined) => dataLoading$.next(loading),
    },
  };
};
