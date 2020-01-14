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

import { mockInjectedMetadata } from '../../services/telemetry_opt_in.test.mocks';

import sinon from 'sinon';
import { uiModules } from 'ui/modules';

uiModules
  .get('kibana')
  // disable stat reporting while running tests,
  // MockInjector used in these tests is not impacted
  .constant('telemetryOptedIn', null);

import { clickBanner } from './click_banner';
import { TelemetryOptInProvider } from '../../services/telemetry_opt_in';

const getMockInjector = ({ simulateFailure }) => {
  const get = sinon.stub();

  const mockHttp = {
    post: sinon.stub(),
  };

  if (simulateFailure) {
    mockHttp.post.returns(Promise.reject(new Error('something happened')));
  } else {
    mockHttp.post.returns(Promise.resolve({}));
  }

  get.withArgs('$http').returns(mockHttp);

  return { get };
};

const getTelemetryOptInProvider = ({ simulateFailure = false, simulateError = false } = {}) => {
  const injector = getMockInjector({ simulateFailure });
  const chrome = {
    addBasePath: url => url,
  };

  const provider = new TelemetryOptInProvider(injector, chrome, false);

  if (simulateError) {
    provider.setOptIn = () => Promise.reject('unhandled error');
  }

  return provider;
};

describe('click_banner', () => {
  it('sets setting successfully and removes banner', async () => {
    const banners = {
      remove: sinon.spy(),
    };

    const optIn = true;
    const bannerId = 'bruce-banner';
    mockInjectedMetadata({ telemetryOptedIn: optIn, allowChangingOptInStatus: true });
    const telemetryOptInProvider = getTelemetryOptInProvider();

    telemetryOptInProvider.setBannerId(bannerId);

    await clickBanner(telemetryOptInProvider, optIn, { _banners: banners });

    expect(telemetryOptInProvider.getOptIn()).toBe(optIn);
    expect(banners.remove.calledOnce).toBe(true);
    expect(banners.remove.calledWith(bannerId)).toBe(true);
  });

  it('sets setting unsuccessfully, adds toast, and does not touch banner', async () => {
    const toastNotifications = {
      addDanger: sinon.spy(),
    };
    const banners = {
      remove: sinon.spy(),
    };
    const optIn = true;
    mockInjectedMetadata({ telemetryOptedIn: null, allowChangingOptInStatus: true });
    const telemetryOptInProvider = getTelemetryOptInProvider({ simulateFailure: true });

    await clickBanner(telemetryOptInProvider, optIn, {
      _banners: banners,
      _toastNotifications: toastNotifications,
    });

    expect(telemetryOptInProvider.getOptIn()).toBe(null);
    expect(toastNotifications.addDanger.calledOnce).toBe(true);
    expect(banners.remove.notCalled).toBe(true);
  });

  it('sets setting unsuccessfully with error, adds toast, and does not touch banner', async () => {
    const toastNotifications = {
      addDanger: sinon.spy(),
    };
    const banners = {
      remove: sinon.spy(),
    };
    const optIn = false;
    mockInjectedMetadata({ telemetryOptedIn: null, allowChangingOptInStatus: true });
    const telemetryOptInProvider = getTelemetryOptInProvider({ simulateError: true });

    await clickBanner(telemetryOptInProvider, optIn, {
      _banners: banners,
      _toastNotifications: toastNotifications,
    });

    expect(telemetryOptInProvider.getOptIn()).toBe(null);
    expect(toastNotifications.addDanger.calledOnce).toBe(true);
    expect(banners.remove.notCalled).toBe(true);
  });
});
