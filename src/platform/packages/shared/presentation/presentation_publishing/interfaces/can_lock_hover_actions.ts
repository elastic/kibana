/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublishingSubject } from '../publishing_subject';

/**
 * This API can lock hover actions
 */
export interface CanLockHoverActions {
  hasLockedHoverActions$: PublishingSubject<boolean>;
  lockHoverActions: (lock: boolean) => void;
}

export const apiCanLockHoverActions = (api: unknown): api is CanLockHoverActions => {
  return Boolean(
    api &&
      (api as CanLockHoverActions).hasLockedHoverActions$ &&
      (api as CanLockHoverActions).lockHoverActions &&
      typeof (api as CanLockHoverActions).lockHoverActions === 'function'
  );
};
