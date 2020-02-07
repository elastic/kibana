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

import { mockInjectedMetadata } from './telemetry_opt_in.test.mocks';
import { TelemetryOptInProvider } from './telemetry_opt_in';

describe('TelemetryOptInProvider', () => {
  const setup = ({ optedIn, simulatePostError, simulatePutError }) => {
    const mockHttp = {
      post: jest.fn(async () => {
        if (simulatePostError) {
          return Promise.reject('Something happened');
        }
      }),
      put: jest.fn(async () => {
        if (simulatePutError) {
          return Promise.reject('Something happened');
        }
      }),
    };

    const mockChrome = {
      addBasePath: url => url,
    };

    mockInjectedMetadata({
      telemetryOptedIn: optedIn,
      allowChangingOptInStatus: true,
      telemetryNotifyUserAboutOptInDefault: true,
    });

    const mockInjector = {
      get: key => {
        switch (key) {
          case '$http': {
            return mockHttp;
          }
          default:
            throw new Error('unexpected injector request: ' + key);
        }
      },
    };

    const provider = new TelemetryOptInProvider(mockInjector, mockChrome, false);
    return {
      provider,
      mockHttp,
    };
  };

  it('should return the current opt-in status', () => {
    const { provider: optedInProvider } = setup({ optedIn: true });
    expect(optedInProvider.getOptIn()).toEqual(true);

    const { provider: optedOutProvider } = setup({ optedIn: false });
    expect(optedOutProvider.getOptIn()).toEqual(false);
  });

  it('should allow an opt-out to take place', async () => {
    const { provider, mockHttp } = setup({ optedIn: true });
    await provider.setOptIn(false);

    expect(mockHttp.post).toHaveBeenCalledWith(`/api/telemetry/v2/optIn`, { enabled: false });

    expect(provider.getOptIn()).toEqual(false);
  });

  it('should allow an opt-in to take place', async () => {
    const { provider, mockHttp } = setup({ optedIn: false });
    await provider.setOptIn(true);

    expect(mockHttp.post).toHaveBeenCalledWith(`/api/telemetry/v2/optIn`, { enabled: true });

    expect(provider.getOptIn()).toEqual(true);
  });

  it('should gracefully handle errors', async () => {
    const { provider, mockHttp } = setup({ optedIn: false, simulatePostError: true });
    await provider.setOptIn(true);

    expect(mockHttp.post).toHaveBeenCalledWith(`/api/telemetry/v2/optIn`, { enabled: true });

    // opt-in change should not be reflected
    expect(provider.getOptIn()).toEqual(false);
  });

  it('should return the current bannerId', () => {
    const { provider } = setup({});
    const bannerId = 'bruce-banner';
    provider.setBannerId(bannerId);
    expect(provider.getBannerId()).toEqual(bannerId);
  });

  describe('Notice Banner', () => {
    it('should return the current bannerId', () => {
      const { provider } = setup({});
      const bannerId = 'bruce-wayne';
      provider.setOptInBannerNoticeId(bannerId);

      expect(provider.getOptInBannerNoticeId()).toEqual(bannerId);
      expect(provider.getBannerId()).not.toEqual(bannerId);
    });

    it('should persist that a user has seen the notice', async () => {
      const { provider, mockHttp } = setup({});
      await provider.setOptInNoticeSeen();

      expect(mockHttp.put).toHaveBeenCalledWith(`/api/telemetry/v2/userHasSeenNotice`);

      expect(provider.notifyUserAboutOptInDefault()).toEqual(false);
    });

    it('should only call the API once', async () => {
      const { provider, mockHttp } = setup({});
      await provider.setOptInNoticeSeen();
      await provider.setOptInNoticeSeen();

      expect(mockHttp.put).toHaveBeenCalledTimes(1);

      expect(provider.notifyUserAboutOptInDefault()).toEqual(false);
    });

    it('should gracefully handle errors', async () => {
      const { provider } = setup({ simulatePutError: true });

      await provider.setOptInNoticeSeen();

      // opt-in change should not be reflected
      expect(provider.notifyUserAboutOptInDefault()).toEqual(true);
    });
  });
});
