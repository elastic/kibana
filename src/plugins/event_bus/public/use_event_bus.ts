/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { subscribe } from './event_bus';

/**
 * React hook to subscribe to the global event bus and return the value of a certain event.
 * @returns The value of the latest event of the specified type.
 */
export const useEventBus = () => {
  const [eventBusValue, setEventBusValue] = useState<any>(null);

  useEffect(() => {
    const subscription = subscribe(setEventBusValue);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return eventBusValue;
};
