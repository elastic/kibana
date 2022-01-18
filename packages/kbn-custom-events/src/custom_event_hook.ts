/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
import { customEvents } from '.';

/**
 * Sets custom event context to be used with following events and clears the context upon unmounting.
 * This hook should be used on the top most level of the application and should not be nested.
 *
 * @param context custom event context to be used with following events
 */
export function useCustomEventContext(context: Record<string, string | number | undefined>) {
  useDeepCompareEffect(() => {
    customEvents.setCustomEventContext(context);
    return () => {
      customEvents.setCustomEventContext(mapValues(context, () => undefined));
    };
  }, [context]);
}
