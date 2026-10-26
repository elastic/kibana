/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import { useProfileAccessor } from '../../../../../context_awareness';
import type {
  HistogramComparisonContext,
  HistogramComparisonController,
  HistogramComparisonSelection,
} from '../../../../../context_awareness/types';

export const useHistogramComparisonController = ({
  query,
  esqlVariables,
  defaultHistogramAvailable,
}: HistogramComparisonContext): HistogramComparisonController | undefined => {
  const getHistogramComparison = useProfileAccessor('getHistogramComparison');
  return useMemo(
    () =>
      getHistogramComparison(() => undefined)({
        query,
        esqlVariables,
        defaultHistogramAvailable,
      }),
    [defaultHistogramAvailable, esqlVariables, getHistogramComparison, query]
  );
};

export const useOptionalObservable = <T>(observable: Observable<T> | undefined): T | undefined => {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    setValue(undefined);
    const subscription = observable?.subscribe(setValue);
    return () => subscription?.unsubscribe();
  }, [observable]);
  return value;
};

export const useHistogramComparisonState = (
  context: HistogramComparisonContext
): {
  selection: HistogramComparisonSelection | undefined;
} => {
  const controller = useHistogramComparisonController(context);
  const selection = useOptionalObservable(controller?.selection$);
  return { selection };
};
