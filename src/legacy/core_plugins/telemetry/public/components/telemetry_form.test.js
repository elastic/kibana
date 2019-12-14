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

import { mockInjectedMetadata } from '../services/telemetry_opt_in.test.mocks';
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { TelemetryForm } from './telemetry_form';
import { TelemetryOptInProvider } from '../services';

jest.mock('ui/new_platform');

const buildTelemetryOptInProvider = () => {
  const mockHttp = {
    post: jest.fn()
  };

  const mockInjector = {
    get: (key) => {
      switch (key) {
        case '$http':
          return mockHttp;
        case 'allowChangingOptInStatus':
          return true;
        default:
          return null;
      }
    }
  };

  const chrome = {
    addBasePath: (url) => url
  };

  return new TelemetryOptInProvider(mockInjector, chrome);
};

describe('TelemetryForm', () => {
  it('renders as expected when allows to change optIn status', () => {
    mockInjectedMetadata({ telemetryOptedIn: null, allowChangingOptInStatus: true });

    expect(shallowWithIntl(
      <TelemetryForm
        spacesEnabled={false}
        query={{ text: '' }}
        onQueryMatchChange={jest.fn()}
        telemetryOptInProvider={buildTelemetryOptInProvider()}
        enableSaving={true}
      />)
    ).toMatchSnapshot();
  });

  it(`doesn't render form when not allowed to change optIn status`, () => {
    mockInjectedMetadata({ telemetryOptedIn: null, allowChangingOptInStatus: false });

    expect(shallowWithIntl(
      <TelemetryForm
        spacesEnabled={false}
        query={{ text: '' }}
        onQueryMatchChange={jest.fn()}
        telemetryOptInProvider={buildTelemetryOptInProvider()}
        enableSaving={true}
      />)
    ).toMatchSnapshot();
  });
});
