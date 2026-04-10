/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useSyncExternalStore } from 'react';
import type { FC } from 'react';
import {
  ExecutionTrackerBadge,
  ExecutionTrackerFlyout,
  type ExecutionTrackerService,
} from '@kbn/workflows-ui';

interface ExecutionTrackerNavControlProps {
  service: ExecutionTrackerService;
}

export const ExecutionTrackerNavControl: FC<ExecutionTrackerNavControlProps> = ({ service }) => {
  const subscribe = useCallback(
    (cb: () => void) => {
      const sub = service.state$.subscribe(cb);
      return () => sub.unsubscribe();
    },
    [service]
  );
  const getSnapshot = useCallback(() => service.state$.getValue(), [service]);
  const { isFlyoutOpen } = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <>
      <ExecutionTrackerBadge service={service} />
      {isFlyoutOpen && <ExecutionTrackerFlyout service={service} />}
    </>
  );
};
