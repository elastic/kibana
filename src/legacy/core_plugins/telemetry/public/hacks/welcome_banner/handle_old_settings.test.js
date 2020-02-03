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

import { CONFIG_TELEMETRY } from '../../../common/constants';
import { handleOldSettings } from './handle_old_settings';
import { TelemetryOptInProvider } from '../../services/telemetry_opt_in';

const getTelemetryOptInProvider = (enabled, { simulateFailure = false } = {}) => {
  const $http = {
    post: async () => {
      if (simulateFailure) {
        return Promise.reject(new Error('something happened'));
      }
      return {};
    },
  };

  const chrome = {
    addBasePath: url => url,
  };
  mockInjectedMetadata({ telemetryOptedIn: enabled, allowChangingOptInStatus: true });

  const $injector = {
    get: key => {
      if (key === '$http') {
        return $http;
      }
      throw new Error(`unexpected mock injector usage for ${key}`);
    },
  };

  return new TelemetryOptInProvider($injector, chrome, false);
};

describe('handle_old_settings', () => {
  it('re-uses old "allowReport" setting and stays opted in', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);
    expect(telemetryOptInProvider.getOptIn()).toBe(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(true);
    config.set.withArgs(CONFIG_TELEMETRY, true).returns(Promise.resolve(true));

    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(false);

    expect(config.get.calledTwice).toBe(true);
    expect(config.set.called).toBe(false);

    expect(config.remove.calledThrice).toBe(true);
    expect(config.remove.getCall(0).args[0]).toBe('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).toBe('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).toBe(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).toBe(true);
  });

  it('re-uses old "telemetry:optIn" setting and stays opted in', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);
    expect(telemetryOptInProvider.getOptIn()).toBe(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.get.withArgs(CONFIG_TELEMETRY, null).returns(true);

    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(false);

    expect(config.get.calledTwice).toBe(true);
    expect(config.set.called).toBe(false);

    expect(config.remove.calledThrice).toBe(true);
    expect(config.remove.getCall(0).args[0]).toBe('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).toBe('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).toBe(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).toBe(true);
  });

  it('re-uses old "allowReport" setting and stays opted out', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);
    expect(telemetryOptInProvider.getOptIn()).toBe(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(true));

    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(false);

    expect(config.get.calledTwice).toBe(true);
    expect(config.set.called).toBe(false);
    expect(config.remove.calledThrice).toBe(true);
    expect(config.remove.getCall(0).args[0]).toBe('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).toBe('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).toBe(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).toBe(false);
  });

  it('re-uses old "telemetry:optIn" setting and stays opted out', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);

    config.get.withArgs(CONFIG_TELEMETRY, null).returns(false);
    config.get.withArgs('xPackMonitoring:allowReport', null).returns(true);

    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(false);

    expect(config.get.calledTwice).toBe(true);
    expect(config.set.called).toBe(false);
    expect(config.remove.calledThrice).toBe(true);
    expect(config.remove.getCall(0).args[0]).toBe('xPackMonitoring:allowReport');
    expect(config.remove.getCall(1).args[0]).toBe('xPackMonitoring:showBanner');
    expect(config.remove.getCall(2).args[0]).toBe(CONFIG_TELEMETRY);

    expect(telemetryOptInProvider.getOptIn()).toBe(false);
  });

  it('acknowledges users old setting even if re-setting fails', async () => {
    const config = {
      get: sinon.stub(),
      set: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null, { simulateFailure: true });

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(false);
    //todo: make the new version of this fail!
    config.set.withArgs(CONFIG_TELEMETRY, false).returns(Promise.resolve(false));

    // note: because it doesn't remove the old settings _and_ returns false, there's no risk of suddenly being opted in
    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(false);

    expect(config.get.calledTwice).toBe(true);
    expect(config.set.called).toBe(false);
  });

  it('removes show banner setting and presents user with choice', async () => {
    const config = {
      get: sinon.stub(),
      remove: sinon.spy(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(null);
    config.get.withArgs('xPackMonitoring:showBanner', null).returns(false);

    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(true);

    expect(config.get.calledThrice).toBe(true);
    expect(config.remove.calledOnce).toBe(true);
    expect(config.remove.getCall(0).args[0]).toBe('xPackMonitoring:showBanner');
  });

  it('is effectively ignored on fresh installs', async () => {
    const config = {
      get: sinon.stub(),
    };

    const telemetryOptInProvider = getTelemetryOptInProvider(null);

    config.get.withArgs('xPackMonitoring:allowReport', null).returns(null);
    config.get.withArgs('xPackMonitoring:showBanner', null).returns(null);

    expect(await handleOldSettings(config, telemetryOptInProvider)).toBe(true);

    expect(config.get.calledThrice).toBe(true);
  });
});
