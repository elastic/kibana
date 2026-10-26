/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockLayout, getMockLayoutWithSections } from '../mocks';
import { placeClonePanel } from './place_clone_panel_strategy';

describe('Clone panel placement strategies', () => {
  it('no other panels', () => {
    const currentPanels = {
      '1': {
        grid: { x: 0, y: 0, w: 6, h: 6 },
        type: 'lens',
        config: {},
      },
    };
    const newLayout = placeClonePanel({
      currentLayout: { panels: currentPanels, sections: {}, pinnedPanels: {} },
      newPanel: { uuid: 'newPanel', type: 'panelType', grid: { w: 6, h: 6 } },
      placeBesideId: '1',
    });
    expect(newLayout.panels).toEqual({
      ...currentPanels,
      newPanel: {
        type: 'panelType',
        grid: {
          x: 6, // placed right beside the other panel
          y: 0,
          w: 6,
          h: 6,
        },
      },
    });
  });

  it('panel collision at desired clone location', () => {
    const panels = getMockLayout().panels;
    const newLayout = placeClonePanel({
      currentLayout: { panels, sections: {}, pinnedPanels: {} },
      newPanel: { uuid: 'newPanel', type: 'panelType', grid: { w: 6, h: 6 } },
      placeBesideId: '1',
    });
    expect(newLayout.panels).toEqual({
      ...panels,
      newPanel: {
        type: 'panelType',
        grid: {
          x: 0,
          y: 6, // instead of being placed beside the cloned panel, it is placed right below
          w: 6,
          h: 6,
        },
      },
    });
  });

  it('ignores panels in other sections', () => {
    const mockedLayout = getMockLayoutWithSections();
    const newLayout = placeClonePanel({
      currentLayout: mockedLayout,
      newPanel: {
        uuid: 'newPanel',
        type: 'panelType',
        grid: { w: 6, h: 6, sectionId: 'section1' },
      },
      placeBesideId: '3',
    });
    expect(newLayout.panels).toEqual({
      ...mockedLayout.panels,
      newPanel: {
        type: 'panelType',
        grid: {
          sectionId: 'section1',
          x: 6, // placed beside panel 3, since is has space beside it in section1
          y: 0,
          w: 6,
          h: 6,
        },
      },
    });
  });
});
