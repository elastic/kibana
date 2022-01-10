/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { useEffect } from 'react';
import { customEvents } from '.';

export function useCustomEventContext(context: Record<string, string | number | undefined>) {
  useEffect(() => {
    customEvents.setCustomEventContext(context);
    return () => {
      customEvents.setCustomEventContext(mapValues(context, () => undefined));
    };
  }, [context]);
}
