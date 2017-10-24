import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { DashboardPanel } from './dashboard_panel';
import { PanelError } from '../panel/panel_error';

import {
  takeMountedSnapshot,
} from 'ui_framework/src/test';

function getProps(props = {}) {
  const defaultTestProps = {
    viewOnlyMode: false,
    isFullScreenMode: false,
    onMaximizePanel: () => {},
    onMinimizePanel: () => {},
    panelId: 'foo1',
    renderEmbeddable: jest.fn(),
    isExpanded: false,
    onDestroy: () => {}
  };
  return _.defaultsDeep(props, defaultTestProps);
}

test('DashboardPanel matches snapshot', () => {
  const component = mount(<DashboardPanel {...getProps()} />);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('Calls render', () => {
  const props = getProps();
  mount(<DashboardPanel {...props} />);
  expect(props.renderEmbeddable.mock.calls.length).toBe(1);
});

test('renders an error when error prop is passed', () => {
  const props = getProps({
    error: 'Simulated error'
  });

  const component = mount(<DashboardPanel {...props} />);
  const panelError = component.find(PanelError);
  expect(panelError.length).toBe(1);
});

