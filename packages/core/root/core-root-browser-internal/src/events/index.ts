/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { registerLoadedKibanaEventType } from './kibana_loaded';

export {
  KBN_LOAD_MARKS,
  KIBANA_LOADED_EVENT,
  LOAD_CORE_CREATED,
  LOAD_FIRST_NAV,
  LOAD_BOOTSTRAP_START,
  LOAD_START,
  LOAD_START_DONE,
  LOAD_SETUP_DONE,
} from './event_names';
export { reportKibanaLoadedEvent } from './kibana_loaded';

export const registerRootEvents = (analytics: AnalyticsServiceSetup) => {
  registerLoadedKibanaEventType(analytics);
};
