import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanel } from './dashboard_panel';

import {
  snapshotComponent,
} from 'ui_framework/src/test';

const containerApiMock = {
  addFilter: () => {},
  getAppState: () => {},
  createChildUistate: () => {},
  registerPanelIndexPattern: () => {},
  updatePanel: () => {}
};

const embeddableHandlerMock = {
  getEditPath: () => Promise.resolve('editPath'),
  getTitleFor: () => Promise.resolve('title'),
  render: jest.fn()
};

function getProps(props = {}) {
  const defaultTestProps = {
    dashboardViewMode: DashboardViewMode.EDIT,
    isFullScreenMode: false,
    panel: {
      gridData: { x: 0, y: 0, w: 6, h: 6, i: 1 },
      panelIndex: '1',
      type: 'visualization',
      id: 'foo1'
    },
    getEmbeddableHandler: () => embeddableHandlerMock,
    isExpanded: false,
    getContainerApi: () => containerApiMock,
    onToggleExpanded: () => {},
    onDeletePanel: () => {}
  };
  return _.defaultsDeep(props, defaultTestProps);
}

test('DashboardPanel matches snapshot', () => {
  const component = mount(<DashboardPanel {...getProps()} />);
  expect(snapshotComponent(component)).toMatchSnapshot();
});

test('and calls render', () => {
  expect(embeddableHandlerMock.render.mock.calls.length).toBe(1);
});
