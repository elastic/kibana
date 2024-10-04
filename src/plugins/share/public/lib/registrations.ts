/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  REACT_FATAL_ERROR_EVENT_TYPE,
  ReactFatalError,
  reactFatalErrorSchema,
} from '@kbn/shared-ux-error-boundary';

interface SetupDeps {
  analytics: AnalyticsServiceSetup;
}

export const registrations = {
  setup(deps: SetupDeps) {
    // register event type for errors caught and reported by @kbn/shared-ux-error-boundary
    deps.analytics.registerEventType<ReactFatalError>({
      eventType: REACT_FATAL_ERROR_EVENT_TYPE,
      schema: reactFatalErrorSchema,
    });
  },
};
