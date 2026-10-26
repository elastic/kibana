/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  changeHistoryTelemetryEvents,
  ChangeHistoryTelemetryEventTypes,
} from '@kbn/change-history-ui';
import { analyticsServiceMock } from '@kbn/core/public/mocks';
import { RUN_WORKFLOW_EXECUTED_EVENT_TYPE } from '@kbn/workflows-ui';
import { workflowsTelemetryEvents } from './events/workflows';
import { TelemetryService } from './telemetry_service';

describe('TelemetryService', () => {
  it('registers workflow, run workflow panel, and change history event types', async () => {
    const analytics = analyticsServiceMock.createAnalyticsServiceSetup();
    const service = new TelemetryService();

    service.setup({ analytics });

    await new Promise((resolve) => setImmediate(resolve));

    const expectedEventCount =
      workflowsTelemetryEvents.length + 1 + changeHistoryTelemetryEvents.length;

    expect(analytics.registerEventType).toHaveBeenCalledTimes(expectedEventCount);
    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: RUN_WORKFLOW_EXECUTED_EVENT_TYPE })
    );
    expect(analytics.registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ChangeHistoryTelemetryEventTypes.Opened,
      })
    );
  });
});
