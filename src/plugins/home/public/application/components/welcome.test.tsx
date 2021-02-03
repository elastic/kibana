/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Welcome } from './welcome';
import { telemetryPluginMock } from '../../../../telemetry/public/mocks';

jest.mock('../kibana_services', () => ({
  getServices: () => ({
    addBasePath: (path: string) => `root${path}`,
    trackUiMetric: () => {},
  }),
}));

test('should render a Welcome screen with the telemetry disclaimer', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer when optIn is true', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  telemetry.telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer when optIn is false', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  telemetry.telemetryService.getIsOptedIn = jest.fn().mockReturnValue(false);
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with no telemetry disclaimer', () => {
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} />);

  expect(component).toMatchSnapshot();
});

test('fires opt-in seen when mounted', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  const mockSetOptedInNoticeSeen = jest.fn();
  telemetry.telemetryNotifications.setOptedInNoticeSeen = mockSetOptedInNoticeSeen;
  shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(mockSetOptedInNoticeSeen).toHaveBeenCalled();
});
