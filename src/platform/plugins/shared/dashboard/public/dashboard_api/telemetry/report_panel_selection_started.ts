/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreServices } from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { DASHBOARD_PANEL_SELECTION_STARTED_EVENT } from '../../utils/telemetry_constants';

/** Reports that the user started selecting panels, i.e. the selection went from empty to non-empty */
export const reportPanelSelectionStarted = (): void => {
  try {
    coreServices.analytics.reportEvent(DASHBOARD_PANEL_SELECTION_STARTED_EVENT, {});
  } catch (error) {
    logger.warn(`Failed to report the ${DASHBOARD_PANEL_SELECTION_STARTED_EVENT} event: ${error}`);
  }
};
