/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { renderWelcomeTelemetryNotice } from './render_welcome_telemetry_notice';
import { mockTelemetryConstants, mockTelemetryService } from './mocks';

describe('renderWelcomeTelemetryNotice', () => {
  const telemetryConstants = mockTelemetryConstants();

  test('it should show the opt-out message', () => {
    const telemetryService = mockTelemetryService();
    const component = mountWithIntl(
      renderWelcomeTelemetryNotice(telemetryService, (url) => url, telemetryConstants)
    );
    expect(component.exists('[id="telemetry.dataManagementDisableCollectionLink"]')).toBe(true);
  });

  test('it should show the opt-in message', () => {
    const telemetryService = mockTelemetryService({ config: { optIn: false } });
    const component = mountWithIntl(
      renderWelcomeTelemetryNotice(telemetryService, (url) => url, telemetryConstants)
    );
    expect(component.exists('[id="telemetry.dataManagementEnableCollectionLink"]')).toBe(true);
  });

  test('it should not show opt-in/out options if user cannot change the settings', () => {
    const telemetryService = mockTelemetryService({ config: { allowChangingOptInStatus: false } });
    const component = mountWithIntl(
      renderWelcomeTelemetryNotice(telemetryService, (url) => url, telemetryConstants)
    );
    expect(component.exists('[id="telemetry.dataManagementDisableCollectionLink"]')).toBe(false);
    expect(component.exists('[id="telemetry.dataManagementEnableCollectionLink"]')).toBe(false);
  });
});
