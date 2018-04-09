import React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import _ from 'lodash';
import sizeMe from 'react-sizeme';

import { getContainerApiMock } from '../__tests__/get_container_api_mock';
import { getEmbeddableFactoryMock } from '../__tests__/get_embeddable_factories_mock';
import { store } from '../../store';
import { DashboardGridContainer } from './dashboard_grid_container';
import { updatePanels } from '../actions';

jest.mock('ui/chrome', () => ({ getKibanaVersion: () => '6.3.0' }), { virtual: true });

jest.mock('ui/notify',
  () => ({
    toastNotifications: {
      addDanger: () => {},
    }
  }), { virtual: true });

function getProps(props = {}) {
  const defaultTestProps = {
    hidden: false,
    getEmbeddableFactory: () => getEmbeddableFactoryMock(),
    getContainerApi: () => getContainerApiMock(),
  };
  return Object.assign(defaultTestProps, props);
}

function createOldPanelData(col, id, row, sizeX, sizeY, panelIndex) {
  return { col, id, row, size_x: sizeX, size_y: sizeY, type: 'visualization', panelIndex };
}

const getSelection = window.getSelection;
beforeAll(() => {
  // sizeme detects the width to be 0 in our test environment. noPlaceholder will mean that the grid contents will
  // get rendered even when width is 0, which will improve our tests.
  sizeMe.noPlaceholders = true;

  // react-grid-layout calls getSelection which isn't support by jsdom
  // it's called regardless of whether we need to remove selection,
  // and in this case we don't need to remove selection
  window.getSelection = () => {
    return {
      removeAllRanges: () => {}
    };
  };
});

afterAll(() => {
  sizeMe.noPlaceholders = false;
  window.getSelection = getSelection;
});

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

  const grid = mount(<Provider store={store}><DashboardGridContainer {...getProps()} /></Provider>);

  const panels = store.getState().dashboard.panels;
  expect(Object.keys(panels).length).toBe(16);

  const foo8Panel = _.find(panels, panel => panel.id === 'foo8');
  expect(foo8Panel.row).toBe(undefined);
  expect(foo8Panel.gridData.y).toBe(35);
  expect(foo8Panel.gridData.x).toBe(0);

  grid.unmount();
});
