/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { buildPanels } from './build_panels';
import type { ActionGroups } from './types';

const euiTheme = {
  colors: { textParagraph: '#333' },
  border: { thin: '1px solid #eee' },
  size: { m: '16px' },
} as unknown as EuiThemeComputed;

describe('buildPanels', () => {
  let closePopover: jest.Mock;

  beforeEach(() => {
    closePopover = jest.fn();
  });

  it('returns a single main panel with id 0 when actions are empty', () => {
    const panels = buildPanels([], closePopover, euiTheme, 'prefix');
    expect(panels).toHaveLength(1);
    expect(panels[0].id).toBe(0);
    expect(panels[0].items).toHaveLength(0);
  });

  describe('group labels', () => {
    it('adds a disabled label item when groupLabel is set', () => {
      const actions: ActionGroups = [{ id: 'alerts', groupLabel: 'Alerts', actions: [] }];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      const labelItem = mainPanel.items?.[0] as Record<string, unknown>;
      expect(labelItem.name).toBe('Alerts');
      expect(labelItem.disabled).toBe(true);
    });

    it('does not add a label item when groupLabel is absent', () => {
      const actions: ActionGroups = [
        {
          id: 'discover',
          actions: [
            {
              id: 'openInDiscover',
              name: 'Open in Discover',
              onClick: jest.fn(),
              ebt: { action: 'openInDiscover', element: 'el' },
            },
          ],
        },
      ];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      expect(mainPanel.items).toHaveLength(1);
    });

    it('applies marginTop only to groups after the first', () => {
      const actions: ActionGroups = [
        { id: 'g1', groupLabel: 'First', actions: [] },
        { id: 'g2', groupLabel: 'Second', actions: [] },
      ];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      const firstLabel = mainPanel.items?.[0] as Record<string, unknown>;
      const secondLabel = mainPanel.items?.[1] as Record<string, unknown>;
      expect((firstLabel.css as Record<string, unknown>).marginTop).toBe(0);
      expect((secondLabel.css as Record<string, unknown>).marginTop).toBe(euiTheme.size.m);
    });
  });

  describe('direct action items', () => {
    it('calls action onClick and closePopover when the item is clicked', () => {
      const onClick = jest.fn();
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [{ id: 'a', name: 'Action', onClick, ebt: { action: 'a', element: 'e' } }],
        },
      ];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      const item = mainPanel.items?.[0] as Record<string, unknown>;
      (item.onClick as () => void)();
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(closePopover).toHaveBeenCalledTimes(1);
    });

    it('uses href and target="_self" for href actions, with no onClick', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            { id: 'a', name: 'Go', href: '/some/path', ebt: { action: 'a', element: 'e' } },
          ],
        },
      ];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      const item = mainPanel.items?.[0] as Record<string, unknown>;
      expect(item.href).toBe('/some/path');
      expect(item.target).toBe('_self');
      expect(item.onClick).toBeUndefined();
    });

    it('excludes an action with neither href nor onClick', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [{ id: 'no-op', name: 'No-op', ebt: { action: 'a', element: 'e' } }],
        },
      ];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      expect(mainPanel.items).toHaveLength(0);
    });

    it('spreads EBT props onto action items', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'a',
              name: 'A',
              onClick: jest.fn(),
              ebt: { action: 'openInDiscover', element: 'tracesPage' },
            },
          ],
        },
      ];
      const [mainPanel] = buildPanels(actions, closePopover, euiTheme, 'prefix');
      const item = mainPanel.items?.[0] as Record<string, unknown>;
      expect(item['data-ebt-action']).toBe('openInDiscover');
      expect(item['data-ebt-element']).toBe('tracesPage');
    });
  });

  describe('actions with sub-items', () => {
    it('creates a sub-panel and links the main item to it via panel id', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'parent',
              name: 'Parent',
              ebt: { action: 'a', element: 'e' },
              items: [
                {
                  id: 'child',
                  name: 'Child',
                  onClick: jest.fn(),
                  ebt: { action: 'b', element: 'e' },
                },
              ],
            },
          ],
        },
      ];
      const panels = buildPanels(actions, closePopover, euiTheme, 'prefix');
      expect(panels).toHaveLength(2);
      expect((panels[0].items?.[0] as Record<string, unknown>).panel).toBe(1);
      expect(panels[1].title).toBe('Parent');
    });

    it('calls sub-item onClick and closePopover when a sub-item is clicked', () => {
      const subItemClick = jest.fn();
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'parent',
              name: 'Parent',
              ebt: { action: 'a', element: 'e' },
              items: [
                {
                  id: 'child',
                  name: 'Child',
                  onClick: subItemClick,
                  ebt: { action: 'b', element: 'e' },
                },
              ],
            },
          ],
        },
      ];
      const panels = buildPanels(actions, closePopover, euiTheme, 'prefix');
      ((panels[1].items?.[0] as Record<string, unknown>).onClick as () => void)();
      expect(subItemClick).toHaveBeenCalledTimes(1);
      expect(closePopover).toHaveBeenCalledTimes(1);
    });

    it('uses href and target="_self" for sub-items with href', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'parent',
              name: 'Parent',
              ebt: { action: 'a', element: 'e' },
              items: [
                {
                  id: 'child',
                  name: 'Child',
                  href: '/child/path',
                  ebt: { action: 'b', element: 'e' },
                },
              ],
            },
          ],
        },
      ];
      const panels = buildPanels(actions, closePopover, euiTheme, 'prefix');
      const subItem = panels[1].items?.[0] as Record<string, unknown>;
      expect(subItem.href).toBe('/child/path');
      expect(subItem.target).toBe('_self');
      expect(subItem.onClick).toBeUndefined();
    });

    it('filters out sub-items with neither href nor onClick', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'parent',
              name: 'Parent',
              ebt: { action: 'a', element: 'e' },
              items: [
                {
                  id: 'valid',
                  name: 'Valid',
                  onClick: jest.fn(),
                  ebt: { action: 'b', element: 'e' },
                },
                { id: 'invalid', name: 'Invalid', ebt: { action: 'c', element: 'e' } },
              ],
            },
          ],
        },
      ];
      const panels = buildPanels(actions, closePopover, euiTheme, 'prefix');
      expect(panels[1].items).toHaveLength(1);
      expect((panels[1].items?.[0] as Record<string, unknown>).name).toBe('Valid');
    });

    it('falls back to a direct action when all sub-items are filtered out', () => {
      const onClick = jest.fn();
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'parent',
              name: 'Parent',
              onClick,
              ebt: { action: 'a', element: 'e' },
              items: [{ id: 'invalid', name: 'Invalid', ebt: { action: 'b', element: 'e' } }],
            },
          ],
        },
      ];
      const panels = buildPanels(actions, closePopover, euiTheme, 'prefix');
      expect(panels).toHaveLength(1);
      const item = panels[0].items?.[0] as Record<string, unknown>;
      expect(item.panel).toBeUndefined();
      expect(item.name).toBe('Parent');
    });

    it('assigns sequential panel ids when multiple actions have sub-items', () => {
      const actions: ActionGroups = [
        {
          id: 'g1',
          actions: [
            {
              id: 'first',
              name: 'First',
              ebt: { action: 'a', element: 'e' },
              items: [
                { id: 'f1', name: 'F1', onClick: jest.fn(), ebt: { action: 'b', element: 'e' } },
              ],
            },
            {
              id: 'second',
              name: 'Second',
              ebt: { action: 'c', element: 'e' },
              items: [
                { id: 's1', name: 'S1', onClick: jest.fn(), ebt: { action: 'd', element: 'e' } },
              ],
            },
          ],
        },
      ];
      const panels = buildPanels(actions, closePopover, euiTheme, 'prefix');
      expect(panels).toHaveLength(3);
      expect((panels[0].items?.[0] as Record<string, unknown>).panel).toBe(1);
      expect((panels[0].items?.[1] as Record<string, unknown>).panel).toBe(2);
    });
  });
});
