/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockDashboardPanels } from '../mocks';
import { placeClonePanel } from './place_clone_panel_strategy';

describe('Clone panel placement strategies', () => {
  it('no other panels', () => {
    const currentPanels = {
      '1': {
        gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
        type: 'lens',
        explicitInput: { id: '1' },
      },
    };
    const { newPanelPlacement, otherPanels } = placeClonePanel({
      width: 6,
      height: 6,
      currentPanels,
      placeBesideId: '1',
    });
    expect(newPanelPlacement).toEqual({
      x: 6, // placed right beside the other panel
      y: 0,
      w: 6,
      h: 6,
    });
    expect(otherPanels).toEqual(currentPanels);
  });

  it('panel collision at desired clone location', () => {
    const { panels } = getMockDashboardPanels();
    const { newPanelPlacement, otherPanels } = placeClonePanel({
      width: 6,
      height: 6,
      currentPanels: panels,
      placeBesideId: '1',
    });
    expect(newPanelPlacement).toEqual({
      x: 0,
      y: 6, // instead of being placed beside the cloned panel, it is placed right below
      w: 6,
      h: 6,
    });
    expect(otherPanels).toEqual(panels);
  });

  it('ignores panels in other sections', () => {
    const { panels } = getMockDashboardPanels(true);

    const { newPanelPlacement, otherPanels } = placeClonePanel({
      width: 6,
      height: 6,
      currentPanels: panels,
      placeBesideId: '3',
      sectionId: 'section1',
    });
    expect(newPanelPlacement).toEqual({
      x: 6, // placed beside panel 3, since is has space beside it in section1
      y: 0,
      w: 6,
      h: 6,
    });
    expect(otherPanels).toEqual(panels);
  });
});
