import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { DashboardViewMode } from '../dashboard_view_mode';
import { DashboardPanel } from './dashboard_panel';
import { PanelError } from '../panel/panel_error';

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
  render: jest.fn(() => Promise.resolve(() => {}))
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
  expect(component).toMatchSnapshot();
});

test('and calls render', () => {
  expect(embeddableHandlerMock.render.mock.calls.length).toBe(1);
});

test('renders an error message when an error is thrown', () => {
  const props = getProps({
    getEmbeddableHandler: () => {
      return {
        getEditPath: () => Promise.resolve('editPath'),
        getTitleFor: () => Promise.resolve('title'),
        render: () => Promise.reject(new Error({ message: 'simulated error' }))
      }
    }
  });
  const component = mount(<DashboardPanel {...props} />);
  return new Promise((resolve, reject) => {
    return process.nextTick(() => {
      const panelElements = component.find(PanelError);
      expect(panelElements.length).toBe(1);
      resolve();
    });
  });
});

