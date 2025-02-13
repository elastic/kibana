/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../services/kibana_services';

// seperate from performance metrics
// reports when a dashboard renders with data
export function initializeTrackContentfulRender() {
  let hadContentfulRender = false;

  return {
    trackContentfulRender: () => {
      if (!hadContentfulRender) {
        coreServices.analytics.reportEvent('dashboard_loaded_with_data', {});
      }
      hadContentfulRender = true;
    },
  };
}
