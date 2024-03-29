/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { renderWelcomeTelemetryNotice } from './render_welcome_telemetry_notice';
import { mockTelemetryConstants, mockTelemetryService } from './mocks';

describe('renderWelcomeTelemetryNotice', () => {
  const telemetryConstants = mockTelemetryConstants();

  test('it should render the WelcomeTelemetryNotice component', () => {
    const reactLazySpy = jest.spyOn(React, 'lazy');
    const telemetryService = mockTelemetryService();
    shallowWithIntl(
      renderWelcomeTelemetryNotice(telemetryService, (url) => url, telemetryConstants)
    );
    expect(reactLazySpy).toHaveBeenCalledTimes(1);
  });
});
