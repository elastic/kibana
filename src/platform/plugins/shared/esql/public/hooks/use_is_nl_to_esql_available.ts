/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { useKibanaServices } from '../kibana_services';

// The checks are requests; this mirror lets the next mount start with the last known result
// instead of adding the AI controls once the requests settle, which would shift the query bar
let lastKnownAvailability = false;

/** Forgets the last known result so tests can change it. */
export const clearNlToEsqlAvailabilityCache = (): void => {
  lastKnownAvailability = false;
};

/** Whether natural language to ES|QL is available (inference plugin, Enterprise license and an AI connector). */
export const useIsNlToEsqlAvailable = (): boolean => {
  const deps = useKibanaServices();
  const [isAvailable, setIsAvailable] = useState(lastKnownAvailability);

  useEffect(() => {
    if (!deps?.esql.isInferenceAvailable) {
      return;
    }
    let cancelled = false;
    const { esql } = deps;
    // The connector lookup is a request, so it is skipped without the license
    const checkAvailability = async () =>
      (await esql.hasEnterpriseLicense()) && (await esql.hasInferenceConnector());
    checkAvailability().then((available) => {
      lastKnownAvailability = available;
      if (!cancelled) {
        setIsAvailable(available);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deps]);

  return isAvailable;
};
