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

/** Whether natural language to ES|QL is available (Enterprise license and an AI connector). */
export const useIsNlToEsqlAvailable = (): boolean => {
  const deps = useKibanaServices();
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (!deps) {
      return;
    }
    let cancelled = false;
    const { esql } = deps;
    (async () =>
      (await esql.hasEnterpriseLicense()) && (await esql.hasInferenceConnector()))().then(
      (available) => !cancelled && setIsAvailable(available)
    );
    return () => {
      cancelled = true;
    };
  }, [deps]);

  return isAvailable;
};
