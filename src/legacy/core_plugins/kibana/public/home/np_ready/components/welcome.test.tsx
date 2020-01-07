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

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    addBasePath: (path: string) => `root${path}`,
    trackUiMetric: () => {},
  }),
}));

test('should render a Welcome screen with the telemetry disclaimer', () => {
  const component = shallow(
    // @ts-ignore
    <Welcome urlBasePath="/" onSkip={() => {}} onOptInSeen={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer when optIn is true', () => {
  const component = shallow(
    // @ts-ignore
    <Welcome urlBasePath="/" onSkip={() => {}} onOptInSeen={() => {}} currentOptInStatus={true} />
  );

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer when optIn is false', () => {
  const component = shallow(
    // @ts-ignore
    <Welcome urlBasePath="/" onSkip={() => {}} onOptInSeen={() => {}} currentOptInStatus={false} />
  );

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with no telemetry disclaimer', () => {
  // @ts-ignore
  const component = shallow(
    // @ts-ignore
    <Welcome urlBasePath="/" onSkip={() => {}} onOptInSeen={() => {}} />
  );

  expect(component).toMatchSnapshot();
});

test('fires opt-in seen when mounted', () => {
  const seen = jest.fn();

  shallow(
    // @ts-ignore
    <Welcome urlBasePath="/" onSkip={() => {}} onOptInSeen={seen} />
  );

  expect(seen).toHaveBeenCalled();
});
