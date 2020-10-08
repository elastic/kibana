/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
