import { store } from '../../store';
import { updatePanel, updatePanels } from '../actions';
import { getPanel } from '../selectors';
import { getDashboard } from '../../selectors';

test('UpdatePanel updates a panel', () => {
  store.dispatch(updatePanels([{ panelIndex: '1', gridData: {} }]));

  store.dispatch(updatePanel({
    panelIndex: '1',
    gridData: {
      x: 1,
      y: 5,
      w: 10,
      h: 1,
      id: '1'
    }
  }));

  const panel = getPanel(getDashboard(store.getState()), '1');
  expect(panel.gridData.x).toBe(1);
  expect(panel.gridData.y).toBe(5);
  expect(panel.gridData.w).toBe(10);
  expect(panel.gridData.h).toBe(1);
  expect(panel.gridData.id).toBe('1');
});
