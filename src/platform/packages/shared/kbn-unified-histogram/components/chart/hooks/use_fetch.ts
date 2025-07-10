/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { filter, share, tap } from 'rxjs';
import { UnifiedHistogramInput$ } from '../../../types';

export const useFetch = ({
  input$,
  beforeFetch,
}: {
  input$: UnifiedHistogramInput$;
  beforeFetch: () => void;
}) => {
  return useMemo(
    () =>
      input$.pipe(
        filter((message) => message.type === 'fetch'),
        tap(beforeFetch),
        share()
      ),
    [beforeFetch, input$]
  );
};
