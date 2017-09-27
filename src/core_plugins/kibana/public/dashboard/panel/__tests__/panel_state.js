import expect from 'expect.js';

import { createPanelState } from '../panel_state';

function createPanelWithDimensions(x, y, w, h) {
  return {
    gridData: {
      x, y, w, h
    }
  };
}

describe('Panel state', function () {
  it('finds a spot on the right', function () {
    // Default setup after a single panel, of default size, is on the grid
    const panels = [createPanelWithDimensions(0, 0, 6, 6)];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(6);
    expect(panel.gridData.y).to.equal(0);
  });

  it('finds a spot on the right when the panel is taller than any other panel on the grid', function () {
    // Should be a little empty spot on the right.
    const panels = [
      createPanelWithDimensions(0, 0, 6, 9),
      createPanelWithDimensions(6, 0, 6, 6),
    ];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(6);
    expect(panel.gridData.y).to.equal(6);
  });

  it('finds an empty spot in the middle of the grid', function () {
    const panels = [
      createPanelWithDimensions(0, 0, 12, 1),
      createPanelWithDimensions(0, 1, 1, 6),
      createPanelWithDimensions(10, 1, 1, 6),
      createPanelWithDimensions(0, 11, 12, 1),
    ];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(1);
    expect(panel.gridData.y).to.equal(1);
  });
});
