/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformPanels } from './transform_panels';
import type { DashboardPanel, DashboardSection } from '../../../server';

jest.mock('../../services/kibana_services', () => {
  function mockTransformOut(state: object, references?: Reference[]) {
    // Implemenation exists for testing purposes only
    // transformOut should not throw if there are no references
    if (!references || references.length === 0) throw new Error('Simulated transformOut error');

    return {
      savedObjectId: references[0].id,
    };
  }
  return {
    embeddableService: {
      getTransforms: async () => ({
        transformOut: mockTransformOut,
      }),
    },
  };
});

describe('transformPanels', () => {
  test('should transform panels', async () => {
    const panels = await transformPanels(
      [
        {
          grid: { x: 0, y: 0, w: 6, h: 6, i: '1' },
          config: {},
          uid: '1',
          type: 'testPanelType',
        },
        {
          title: 'Section One',
          collapsed: true,
          grid: {
            y: 6,
            i: 'section1',
          },
          panels: [
            {
              grid: { x: 0, y: 0, w: 6, h: 6, i: '3' },
              config: {},
              uid: '3',
              type: 'testPanelType',
            },
          ],
        },
      ],
      [
        {
          id: '1234',
          type: 'testPanelType',
          name: '1:savedObjectRef',
        },
        {
          id: '5678',
          type: 'testPanelType',
          name: '3:savedObjectRef',
        },
      ]
    );
    expect((panels[0] as DashboardPanel).config).toEqual({
      savedObjectId: '1234',
    });
    expect((panels[1] as DashboardSection).panels[0].config).toEqual({
      savedObjectId: '5678',
    });
  });

  test('should handle transformOut throw', async () => {
    const panels = await transformPanels([
      {
        grid: { x: 0, y: 0, w: 6, h: 6, i: '1' },
        config: { title: 'panel One' },
        uid: '1',
        type: 'testPanelType',
      },
    ]);
    expect((panels[0] as DashboardPanel).config).toEqual({
      title: 'panel One',
    });
  });
});
