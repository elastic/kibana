/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { checkErrorExplanationAvailable } from './explain_esql_error';

/**
 * Tells whether the explanation can be used, so callers can leave the AI help out when it cannot.
 * The server is only asked when `isEnabled`, which is when there is an error to explain.
 */
export const useErrorExplanationAvailable = (
  http: Pick<HttpStart, 'get'>,
  isEnabled: boolean
): boolean => {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    let isCurrent = true;
    checkErrorExplanationAvailable(http).then((available) => {
      if (isCurrent) {
        setIsAvailable(available);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [http, isEnabled]);

  return isAvailable && isEnabled;
};
