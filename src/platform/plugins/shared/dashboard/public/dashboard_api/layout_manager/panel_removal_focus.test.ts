/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLayout } from './types';
import { getRemovalFocusTarget } from '@kbn/presentation-util';
import { getPanelIdsInVisualOrder, restoreFocusAfterPanelRemoval } from './panel_removal_focus';

const createLayout = (overrides: Partial<DashboardLayout> = {}): DashboardLayout =>
  ({
    panels: {},
    sections: {},
    pinnedPanels: {},
    ...overrides,
  } as DashboardLayout);

describe('panel removal focus', () => {
  describe('getPanelIdsInVisualOrder', () => {
    it('orders pinned panels first and grid panels by visual reading order', () => {
      const layout = createLayout({
        pinnedPanels: {
          pinnedSecond: { order: 1, width: 'medium', grow: false, type: 'test' },
          pinnedFirst: { order: 0, width: 'medium', grow: false, type: 'test' },
        },
        panels: {
          bottom: { type: 'test', grid: { x: 0, y: 10, w: 1, h: 1 } },
          topRight: { type: 'test', grid: { x: 6, y: 0, w: 1, h: 1 } },
          topLeft: { type: 'test', grid: { x: 0, y: 0, w: 1, h: 1 } },
        },
      });

      expect(getPanelIdsInVisualOrder(layout)).toEqual([
        'pinnedFirst',
        'pinnedSecond',
        'topLeft',
        'topRight',
        'bottom',
      ]);
    });

    it('places section panels at the section position and skips collapsed sections', () => {
      const layout = createLayout({
        sections: {
          open: {
            collapsed: false,
            title: 'Open',
            grid: { y: 5 },
          },
          closed: {
            collapsed: true,
            title: 'Closed',
            grid: { y: 10 },
          },
        },
        panels: {
          before: { type: 'test', grid: { x: 0, y: 0, w: 1, h: 1 } },
          openRight: {
            type: 'test',
            grid: { x: 6, y: 0, w: 1, h: 1, sectionId: 'open' },
          },
          openLeft: {
            type: 'test',
            grid: { x: 0, y: 0, w: 1, h: 1, sectionId: 'open' },
          },
          hidden: {
            type: 'test',
            grid: { x: 0, y: 0, w: 1, h: 1, sectionId: 'closed' },
          },
          after: { type: 'test', grid: { x: 0, y: 15, w: 1, h: 1 } },
        },
      });

      expect(getPanelIdsInVisualOrder(layout)).toEqual([
        'before',
        'openLeft',
        'openRight',
        'after',
      ]);
    });
  });

  describe('getRemovalFocusTarget', () => {
    it('prefers the visual predecessor', () => {
      expect(getRemovalFocusTarget(['first', 'removed', 'last'], 'removed')).toBe('first');
    });

    it('uses the next panel when removing the first panel', () => {
      expect(getRemovalFocusTarget(['removed', 'next'], 'removed')).toBe('next');
    });

    it('returns undefined when removing the only panel', () => {
      expect(getRemovalFocusTarget(['removed'], 'removed')).toBeUndefined();
    });
  });

  it('focuses the visual predecessor panel container after removal', () => {
    jest.useFakeTimers();
    const layout = createLayout({
      panels: {
        previous: { type: 'test', grid: { x: 0, y: 0, w: 1, h: 1 } },
        removed: { type: 'test', grid: { x: 6, y: 0, w: 1, h: 1 } },
      },
    });
    const previousPanel = document.createElement('div');
    previousPanel.id = 'panel-previous';
    previousPanel.tabIndex = -1;
    document.body.appendChild(previousPanel);

    restoreFocusAfterPanelRemoval(layout, 'removed');
    jest.runAllTimers();

    expect(document.activeElement).toBe(previousPanel);
    previousPanel.remove();
    jest.useRealTimers();
  });

  it('focuses the visual successor when removing the first panel', () => {
    jest.useFakeTimers();
    const layout = createLayout({
      panels: {
        removed: { type: 'test', grid: { x: 0, y: 0, w: 1, h: 1 } },
        next: { type: 'test', grid: { x: 6, y: 0, w: 1, h: 1 } },
      },
    });
    const nextPanel = document.createElement('div');
    nextPanel.id = 'panel-next';
    nextPanel.tabIndex = -1;
    document.body.appendChild(nextPanel);

    restoreFocusAfterPanelRemoval(layout, 'removed');
    jest.runAllTimers();

    expect(document.activeElement).toBe(nextPanel);
    nextPanel.remove();
    jest.useRealTimers();
  });

  it('focuses a remaining visible panel when removing a panel from a collapsed section', () => {
    jest.useFakeTimers();
    const layout = createLayout({
      sections: {
        closed: {
          collapsed: true,
          title: 'Closed',
          grid: { y: 10 },
        },
      },
      panels: {
        visible: { type: 'test', grid: { x: 0, y: 0, w: 1, h: 1 } },
        hidden: {
          type: 'test',
          grid: { x: 0, y: 0, w: 1, h: 1, sectionId: 'closed' },
        },
      },
    });
    const visiblePanel = document.createElement('div');
    visiblePanel.id = 'panel-visible';
    visiblePanel.tabIndex = -1;
    document.body.appendChild(visiblePanel);

    restoreFocusAfterPanelRemoval(layout, 'hidden');
    jest.runAllTimers();

    expect(document.activeElement).toBe(visiblePanel);
    visiblePanel.remove();
    jest.useRealTimers();
  });

  it('focuses Add when no visible panels remain', () => {
    jest.useFakeTimers();
    const layout = createLayout({
      sections: {
        closed: {
          collapsed: true,
          title: 'Closed',
          grid: { y: 10 },
        },
      },
      panels: {
        removed: { type: 'test', grid: { x: 0, y: 0, w: 1, h: 1 } },
        hidden: {
          type: 'test',
          grid: { x: 0, y: 0, w: 1, h: 1, sectionId: 'closed' },
        },
      },
    });
    const addButton = document.createElement('button');
    addButton.dataset.testSubj = 'dashboardAddTopNavButton';
    document.body.appendChild(addButton);

    restoreFocusAfterPanelRemoval(layout, 'removed');
    jest.runAllTimers();

    expect(document.activeElement).toBe(addButton);
    addButton.remove();
    jest.useRealTimers();
  });
});
