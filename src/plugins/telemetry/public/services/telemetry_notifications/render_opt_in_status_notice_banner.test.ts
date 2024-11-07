/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderOptInStatusNoticeBanner } from './render_opt_in_status_notice_banner';
import {
  analyticsServiceMock,
  httpServiceMock,
  i18nServiceMock,
  overlayServiceMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import { mockTelemetryConstants, mockTelemetryService } from '../../mocks';

describe('renderOptInStatusNoticeBanner', () => {
  it('adds a banner to banners with priority of 10000', () => {
    const bannerID = 'brucer-wayne';
    const overlays = overlayServiceMock.createStartContract();
    const mockHttp = httpServiceMock.createStartContract();
    const analytics = analyticsServiceMock.createAnalyticsServiceStart();
    const i18n = i18nServiceMock.createStartContract();
    const theme = themeServiceMock.createStartContract();
    const telemetryConstants = mockTelemetryConstants();
    const telemetryService = mockTelemetryService();
    overlays.banners.add.mockReturnValue(bannerID);

    const returnedBannerId = renderOptInStatusNoticeBanner({
      http: mockHttp,
      onSeen: jest.fn(),
      overlays,
      analytics,
      i18n,
      theme,
      telemetryConstants,
      telemetryService,
    });

    expect(overlays.banners.add).toBeCalledTimes(1);

    expect(returnedBannerId).toBe(bannerID);
    const bannerConfig = overlays.banners.add.mock.calls[0];

    expect(bannerConfig[0]).not.toBe(undefined);
    expect(bannerConfig[1]).toBe(10000);
  });
});
