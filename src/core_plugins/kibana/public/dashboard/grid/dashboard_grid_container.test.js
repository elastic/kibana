import React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import _ from 'lodash';

import { getContainerApiMock } from '../__tests__/get_container_api_mock';
import { getEmbeddableHandlerMock } from '../__tests__/get_embeddable_handlers_mock';
import { store } from '../../store';
import { DashboardGridContainer } from './dashboard_grid_container';
import { updatePanels } from '../actions';

jest.mock('ui/chrome', () => ({ getKibanaVersion: () => '6.0.0' }), { virtual: true });

function getProps(props = {}) {
  const defaultTestProps = {
    hidden: false,
    getEmbeddableHandler: () => getEmbeddableHandlerMock(),
    getContainerApi: () => getContainerApiMock(),
  };
  return Object.assign(defaultTestProps, props);
}

function createOldPanelData(col, id, row, sizeX, sizeY, panelIndex) {
  return { col, id, row, size_x: sizeX, size_y: sizeY, type: 'visualization', panelIndex };
}

test('loads old panel data in the right order', () => {
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

  store.dispatch(updatePanels(panelData));

  mount(<Provider store={store}><DashboardGridContainer {...getProps()} /></Provider>);

  const panels = store.getState().dashboard.panels;
  expect(Object.keys(panels).length).toBe(16);

  const foo8Panel = _.find(panels, panel => panel.id === 'foo8');
  expect(foo8Panel.row).toBe(undefined);
  expect(foo8Panel.gridData.y).toBe(7);
  expect(foo8Panel.gridData.x).toBe(0);
});
