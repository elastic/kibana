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
    const panels = [createPanelWithDimensions(0, 0, 24, 30)];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(24);
    expect(panel.gridData.y).to.equal(0);
  });

  it('finds a spot on the right when the panel is taller than any other panel on the grid', function () {
    // Should be a little empty spot on the right.
    const panels = [
      createPanelWithDimensions(0, 0, 24, 45),
      createPanelWithDimensions(24, 0, 24, 30),
    ];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(24);
    expect(panel.gridData.y).to.equal(30);
  });

  it('finds an empty spot in the middle of the grid', function () {
    const panels = [
      createPanelWithDimensions(0, 0, 48, 5),
      createPanelWithDimensions(0, 5, 4, 30),
      createPanelWithDimensions(40, 5, 4, 30),
      createPanelWithDimensions(0, 55, 48, 5),
    ];

    const panel = createPanelState('1', 'a type', '1', panels);
    expect(panel.gridData.x).to.equal(4);
    expect(panel.gridData.y).to.equal(5);
  });
});
