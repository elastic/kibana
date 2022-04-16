/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderOptedInNoticeBanner } from './render_opted_in_notice_banner';
import { overlayServiceMock, httpServiceMock } from '@kbn/core/public/mocks';
import { mockTelemetryConstants } from '../../mocks';

describe('renderOptedInNoticeBanner', () => {
  it('adds a banner to banners with priority of 10000', () => {
    const bannerID = 'brucer-wayne';
    const overlays = overlayServiceMock.createStartContract();
    const mockHttp = httpServiceMock.createStartContract();
    const telemetryConstants = mockTelemetryConstants();
    overlays.banners.add.mockReturnValue(bannerID);

    const returnedBannerId = renderOptedInNoticeBanner({
      http: mockHttp,
      onSeen: jest.fn(),
      overlays,
      telemetryConstants,
    });

    expect(overlays.banners.add).toBeCalledTimes(1);

    expect(returnedBannerId).toBe(bannerID);
    const bannerConfig = overlays.banners.add.mock.calls[0];

    expect(bannerConfig[0]).not.toBe(undefined);
    expect(bannerConfig[1]).toBe(10000);
  });
});
