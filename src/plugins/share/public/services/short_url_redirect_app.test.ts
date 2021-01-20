/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createShortUrlRedirectApp } from './short_url_redirect_app';
import { coreMock } from '../../../../core/public/mocks';
import { hashUrl } from '../../../kibana_utils/public';

jest.mock('../../../kibana_utils/public', () => ({ hashUrl: jest.fn((x) => `${x}/hashed`) }));

describe('short_url_redirect_app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch url and redirect to hashed version', async () => {
    const coreSetup = coreMock.createSetup({ basePath: 'base' });
    coreSetup.http.get.mockResolvedValueOnce({ url: '/app/abc' });
    const locationMock = { pathname: '/base/goto/12345', href: '' } as Location;

    const { mount } = createShortUrlRedirectApp(coreSetup, locationMock);
    await mount();

    // check for fetching the complete URL
    expect(coreSetup.http.get).toHaveBeenCalledWith('/api/short_url/12345');
    // check for hashing the URL returned from the server
    expect(hashUrl).toHaveBeenCalledWith('/app/abc');
    // check for redirecting to the prepended path
    expect(locationMock.href).toEqual('base/app/abc/hashed');
  });
});
