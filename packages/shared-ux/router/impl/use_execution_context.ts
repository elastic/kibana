/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
import { SharedUXExecutionContextSetup } from './services';
import { SharedUXExecutionContext } from './types';

/**
 * Set and clean up application level execution context
 * @param executionContext
 * @param context
 */
export function useSharedUXExecutionContext(
  executionContext: SharedUXExecutionContextSetup | undefined,
  context: SharedUXExecutionContext
) {
  useDeepCompareEffect(() => {
    executionContext?.set(context);

    return () => {
      executionContext?.clear();
    };
  }, [context]);
}
