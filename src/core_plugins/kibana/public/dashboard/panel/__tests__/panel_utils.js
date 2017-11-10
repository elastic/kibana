import expect from 'expect.js';
import { PanelUtils } from '../panel_utils';
import { DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from '../../dashboard_constants';

describe('PanelUtils', function () {
  it('convertOldPanelData gives supplies width and height when missing', () => {
    const panelData = [
      { col: 3, id: 'foo1', row: 1, type: 'visualization', panelIndex: 1 },
      { col: 3, id: 'foo2', row: 1, size_x: 3, size_y: 2, type: 'visualization', panelIndex: 2 }
    ];
    panelData.forEach(oldPanel => PanelUtils.convertOldPanelData(oldPanel));
    expect(panelData[0].gridData.w = DEFAULT_PANEL_WIDTH);
    expect(panelData[0].gridData.h = DEFAULT_PANEL_HEIGHT);

    expect(panelData[1].gridData.w = 3);
    expect(panelData[1].gridData.h = 2);
  });
});
