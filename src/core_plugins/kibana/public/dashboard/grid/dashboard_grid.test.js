import React from 'react';
import { shallow } from 'enzyme';
import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelUtils } from '../panel/panel_utils';

import { DashboardGrid } from './dashboard_grid';
import { DashboardPanel } from '../panel/dashboard_panel';

jest.mock('ui/chrome', () => ({ getKibanaVersion: () => '6.0.0' }), { virtual: true });

const getContainerApi = () => {
  return {
    addFilter: () => {},
    getAppState: () => {},
    createChildUistate: () => {},
    registerPanelIndexPattern: () => {},
    updatePanel: () => {}
  };
};

const embeddableHandlerMock = {
  getEditPath: () => {},
  getTitleFor: ()  => {},
  render: jest.fn()
};

function getProps(props = {}) {
  const defaultTestProps = {
    dashboardViewMode: DashboardViewMode.EDIT,
    isFullScreenMode: false,
    panels: [{
      gridData: { x: 0, y: 0, w: 6, h: 6, i: 1 },
      panelIndex: '1',
      type: 'visualization',
      id: '123'
    },{
      gridData: { x: 6, y: 6, w: 6, h: 6, i: 2 },
      panelIndex: '2',
      type: 'visualization',
      id: '456'
    }],
    getEmbeddableHandler: () => embeddableHandlerMock,
    isExpanded: false,
    getContainerApi,
    expandPanel: () => {},
    onPanelRemoved: () => {}
  };
  return Object.assign(defaultTestProps, props);
}

test('renders DashboardGrid', () => {
  const component = shallow(<DashboardGrid {...getProps()} />);
  expect(component).toMatchSnapshot();
  const panelElements = component.find(DashboardPanel);
  expect(panelElements.length).toBe(2);
});

test('renders DashboardGrid with no visualizations', () => {
  const component = shallow(<DashboardGrid {...getProps({ panels: [] })} />);
  expect(component).toMatchSnapshot();
});

function createOldPanelData(col, id, row, sizeX, sizeY, panelIndex) {
  return { col, id, row, size_x: sizeX, size_y: sizeY, type: 'visualization', panelIndex };
}

function findPanelWithId(panelElements, id) {
  for (let i = 0; i < panelElements.length; i++) {
    if (panelElements.at(i).props().panel.id === id) {
      return panelElements.at(i);
    }
  }
  return null;
}

test('Loads old panel data in the right order', () => {
  const panelData = [
    createOldPanelData(3, 'foo1', 1, 2, 2, 1),
    createOldPanelData(5, 'foo2', 1, 2, 2, 2),
    createOldPanelData(9, 'foo3', 1, 2, 2, 3),
    createOldPanelData(11, 'foo4', 1, 2, 2, 4),
    createOldPanelData(1, 'foo5', 1, 2, 2, 5),
    createOldPanelData(7, 'foo6', 1, 2, 2, 6),
    createOldPanelData(4, 'foo7', 6, 3, 2, 7),
    createOldPanelData(1, 'foo8', 8, 3, 2, 8),
    createOldPanelData(10, 'foo9', 8, 3, 2, 9),
    createOldPanelData(10, 'foo10', 6, 3, 2, 10),
    createOldPanelData(4, 'foo11', 8, 3, 2, 11),
    createOldPanelData(7, 'foo12', 8, 3, 2, 12),
    createOldPanelData(1, 'foo13', 6, 3, 2, 13),
    createOldPanelData(7, 'foo14', 6, 3, 2, 14),
    createOldPanelData(5, 'foo15', 3, 6, 3, 15),
    createOldPanelData(1, 'foo17', 3, 4, 3, 16)
  ];
  panelData.forEach(oldPanel => PanelUtils.convertOldPanelData(oldPanel));
  const props = getProps({ panels: panelData });

  const component = shallow(<DashboardGrid {...props} />);
  const panelElements = component.find(DashboardPanel);
  expect(panelElements.length).toBe(16);

  const foo8PanelElement = findPanelWithId(panelElements, 'foo8');
  const panel = foo8PanelElement.props().panel;
  expect(panel.row).toBe(undefined);
  expect(panel.gridData.y).toBe(7);
  expect(panel.gridData.x).toBe(0);
});
