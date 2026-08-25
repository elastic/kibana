/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { type Observable, scan } from 'rxjs';
import type { FatalError } from '@kbn/core-fatal-errors-browser';

interface FatalErrorScreenProps {
  error$: Observable<FatalError>;
  children: (errors: FatalError[]) => React.ReactNode;
}

export function FatalErrorScreen({ children, error$ }: FatalErrorScreenProps) {
  const [errors, setErrors] = useState<FatalError[]>([]);
  const handleReload = useCallback(() => window.location.reload(), []);

  useEffect(() => {
    window.addEventListener('hashchange', handleReload);

    return () => window.removeEventListener('hashchange', handleReload);
  }, [handleReload]);

  useEffect(() => {
    const subscription = error$
      .pipe(scan((acc, error) => [...acc, error], [] as FatalError[]))
      .subscribe(setErrors);

    return () => subscription.unsubscribe();
  }, [error$]);

  return children(errors);
}
