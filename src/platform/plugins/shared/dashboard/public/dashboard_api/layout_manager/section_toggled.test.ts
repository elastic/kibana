/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { initializeTrackPanel } from '../track_panel';
import type { initializeViewModeManager } from '../view_mode_manager';
import { initializeLayoutManager } from './layout_manager';

// kept apart from `layout_manager.test.ts`, which disables `distinctUntilChanged` for the whole file

const trackPanelMock = {
  setScrollToPanelId: jest.fn(),
  setHighlightPanelId: jest.fn(),
  scrollToBottom$: { next: jest.fn() },
} as unknown as ReturnType<typeof initializeTrackPanel>['api'];

const viewModeManagerMock = { api: { viewMode$: new BehaviorSubject('view') } } as ReturnType<
  typeof initializeViewModeManager
>;

const panel = {
  grid: { w: 1, h: 1, x: 0, y: 0 },
  type: 'testPanelType',
  config: { title: 'Panel One' },
  id: 'panelOne',
};

const section = {
  title: 'Section one',
  collapsed: false,
  id: 'section1',
  grid: { y: 1 },
  panels: [panel],
};

describe('layout manager: sectionToggled$', () => {
  test('emits when a section is collapsed or expanded, but not when one is added', () => {
    const layoutManager = initializeLayoutManager(
      viewModeManagerMock,
      [section],
      [],
      trackPanelMock
    );
    const onToggled = jest.fn();
    layoutManager.internalApi.sectionToggled$.subscribe(onToggled);
    const { layout$ } = layoutManager.api;
    expect(onToggled).not.toHaveBeenCalled();

    layout$.next({
      ...layout$.value,
      sections: { ...layout$.value.sections, section2: { ...section, grid: { y: 5 } } },
    });
    expect(onToggled).not.toHaveBeenCalled();

    layout$.next({
      ...layout$.value,
      sections: {
        ...layout$.value.sections,
        section1: { ...layout$.value.sections.section1, collapsed: true },
      },
    });
    expect(onToggled).toHaveBeenCalledTimes(1);

    layout$.next({
      ...layout$.value,
      sections: {
        ...layout$.value.sections,
        section1: { ...layout$.value.sections.section1, collapsed: false },
      },
    });
    expect(onToggled).toHaveBeenCalledTimes(2);
  });

  test('does not emit for layout changes that leave the collapsed sections alone', () => {
    const layoutManager = initializeLayoutManager(
      viewModeManagerMock,
      [{ ...section, collapsed: true }],
      [],
      trackPanelMock
    );
    const onToggled = jest.fn();
    layoutManager.internalApi.sectionToggled$.subscribe(onToggled);
    const { layout$ } = layoutManager.api;

    // e.g. every undo / redo step and every panel resize emits a new layout
    layout$.next({ ...layout$.value });
    expect(onToggled).not.toHaveBeenCalled();
  });
});
