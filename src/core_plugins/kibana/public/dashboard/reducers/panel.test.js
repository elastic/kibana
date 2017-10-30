import { store } from '../../store';
import { updatePanel, updatePanels } from '../actions';
import {
  getPanel,
  getPanelType,
} from '../../selectors';

test('UpdatePanel updates a panel', () => {
  store.dispatch(updatePanels([{ panelIndex: '1', gridData: {} }]));

  store.dispatch(updatePanel({
    panelIndex: '1',
    type: 'mySpecialType',
    gridData: {
      x: 1,
      y: 5,
      w: 10,
      h: 1,
      id: '1'
    }
  }));

  const panel = getPanel(store.getState(), '1');
  expect(panel.gridData.x).toBe(1);
  expect(panel.gridData.y).toBe(5);
  expect(panel.gridData.w).toBe(10);
  expect(panel.gridData.h).toBe(1);
  expect(panel.gridData.id).toBe('1');
});

test('getPanelType', () => {
  expect(getPanelType(store.getState(), '1')).toBe('mySpecialType');
});
