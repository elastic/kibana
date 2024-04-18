/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { registerKibanaStartedEvent } from './kibana_started';

export { reportKibanaStartedEvent, type UptimeSteps } from './kibana_started';

export const registerRootEvents = (analytics: AnalyticsServiceSetup) => {
  registerKibanaStartedEvent(analytics);
};
