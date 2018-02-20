jest.mock('ui/chrome',
  () => ({
    getKibanaVersion: () => '6.3.0',
  }), { virtual: true });

import { PanelUtils } from './panel_utils';
import { DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from '../dashboard_constants';

test('parseVersion', () => {
  const { major, minor } = PanelUtils.parseVersion('6.2.0');
  expect(major).toBe(6);
  expect(minor).toBe(2);
});

test('convertPanelDataPre_6_1 gives supplies width and height when missing', () => {
  const panelData = [
    { col: 3, id: 'foo1', row: 1, type: 'visualization', panelIndex: 1 },
    { col: 3, id: 'foo2', row: 1, size_x: 3, size_y: 2, type: 'visualization', panelIndex: 2 }
  ];
  panelData.forEach(oldPanel => PanelUtils.convertPanelDataPre_6_1(oldPanel));
  expect(panelData[0].gridData.w).toBe(DEFAULT_PANEL_WIDTH);
  expect(panelData[0].gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelData[0].version).toBe('6.3.0');

  expect(panelData[1].gridData.w).toBe(3);
  expect(panelData[1].gridData.h).toBe(2);
  expect(panelData[1].version).toBe('6.3.0');
});

test('convertPanelDataPre_6_3 scales panel dimensions', () => {
  const oldPanel = {
    gridData: {
      h: 3,
      w: 7,
      x: 2,
      y: 5,
    },
    version: '6.2.0'
  };
  const updatedPanel = PanelUtils.convertPanelDataPre_6_3(oldPanel);
  expect(updatedPanel.gridData.w).toBe(28);
  expect(updatedPanel.gridData.h).toBe(15);
  expect(updatedPanel.gridData.x).toBe(8);
  expect(updatedPanel.gridData.y).toBe(25);
  expect(updatedPanel.version).toBe('6.3.0');
});
