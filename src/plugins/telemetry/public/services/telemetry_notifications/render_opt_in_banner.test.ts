/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { renderOptInBanner } from './render_opt_in_banner';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { overlayServiceMock } from '../../../../../core/public/overlays/overlay_service.mock';

describe('renderOptInBanner', () => {
  it('adds a banner to banners with priority of 10000', () => {
    const bannerID = 'brucer-wayne';
    const overlays = overlayServiceMock.createStartContract();
    overlays.banners.add.mockReturnValue(bannerID);

    const returnedBannerId = renderOptInBanner({
      setOptIn: jest.fn(),
      overlays,
    });

    expect(overlays.banners.add).toBeCalledTimes(1);

    expect(returnedBannerId).toBe(bannerID);
    const bannerConfig = overlays.banners.add.mock.calls[0];

    expect(bannerConfig[0]).not.toBe(undefined);
    expect(bannerConfig[1]).toBe(10000);
  });
});
