/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prefixReferencesFromPanel } from '../../../../common';
import { getPanelReferences } from './get_panel_references';
import type { SavedDashboardPanel } from '../../../dashboard_saved_object';

const storedPanel: SavedDashboardPanel = {
  panelIndex: '1',
  type: 'test',
  gridData: { x: 0, y: 0, h: 15, w: 15, i: '1' },
  embeddableConfig: {},
};

const ref = {
  name: 'refName1',
  id: '1234',
  type: 'index-pattern',
};

describe('getPanelReferences', () => {
  describe('>= 7.13', () => {
    test('should return panels prefixed by panel id', () => {
      const containerReferences = [
        ...prefixReferencesFromPanel('1', [ref]),
        ...prefixReferencesFromPanel('2', [ref]),
      ];
      expect(getPanelReferences(containerReferences, storedPanel)).toEqual([ref]);
    });
  });

  describe('< 7.13', () => {
    const containerReferences = [
      ref,
      {
        ...ref,
        name: 'refName2',
      },
      {
        name: 'drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:d72ebb1a-f718-43c6-80e9-365ee711d40b:dashboardId',
        type: 'dashboard',
        id: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
      },
      {
        name: 'drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:16a66270-6c76-4756-b8e2-52bbf47cc5e3:dashboardId',
        type: 'dashboard',
        id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      },
    ];

    const enhancements = {
      dynamicActions: {
        events: [
          {
            eventId: 'd72ebb1a-f718-43c6-80e9-365ee711d40b',
          },
        ],
      },
    };

    test('should return complete reference set for by-reference panel', () => {
      const byReferenceState = {
        ...storedPanel,
        panelRefName: ref.name,
        embeddableConfig: {
          enhancements,
        },
      };
      expect(getPanelReferences(containerReferences, byReferenceState)).toEqual([
        containerReferences[2],
        containerReferences[0],
      ]);
    });

    test('should return incomplete reference set for by-value panel', () => {
      const byValueState = {
        ...storedPanel,
        embeddableConfig: {
          enhancements,
        },
      };
      // containerReferences[0] is a reference for this panel
      // but it is not returned because is not possible for dashboard
      // to determine that containerReferences[0] is a reference for this panel
      expect(getPanelReferences(containerReferences, byValueState)).toEqual([
        containerReferences[2],
      ]);
    });
  });
});
