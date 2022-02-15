/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaExecutionContext, CoreStart } from 'kibana/public';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';

/**
 * Set and clean up application level execution context
 * @param executionContext
 * @param context
 */
export function useExecutionContext(
  executionContext: CoreStart['executionContext'],
  context: KibanaExecutionContext
) {
  useDeepCompareEffect(() => {
    executionContext.set(context);

    return () => {
      executionContext.clear();
    };
  }, [context]);
}
