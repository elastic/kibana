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

import React from 'react';
import { shallow } from 'enzyme';
import { Welcome } from './welcome';

jest.mock('../kibana_services', () => ({
  getServices: () => ({
    addBasePath: (path: string) => `root${path}`,
    trackUiMetric: () => {},
    METRIC_TYPE: {
      LOADED: 'loaded',
      CLICK: 'click',
    },
  }),
}));

test('should render a Welcome screen with the telemetry disclaimer', () => {
  const component = shallow(
    // @ts-ignore
    <Welcome urlBase="/" onSkip={() => {}} currentOptInStatus={true} onOptInSeen={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer text addapted to disable and stop collection when optInStatus is true', () => {
  const component = shallow(
    // @ts-ignore
    <Welcome urlBase="/" onSkip={() => {}} currentOptInStatus={true} onOptInSeen={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer text addapted to enable and start collection when optInStatus is false', () => {
  const component = shallow(
    // @ts-ignore
    <Welcome urlBase="/" onSkip={() => {}} currentOptInStatus={false} onOptInSeen={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('fires opt-in seen when mounted', () => {
  const seen = jest.fn();

  shallow(
    // @ts-ignore
    <Welcome urlBase="/" onSkip={() => {}} showTelemetryDisclaimer={true} onOptInSeen={seen} />
  );

  expect(seen).toHaveBeenCalled();
});
