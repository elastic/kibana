/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { initializeLayoutManager } from './layout_manager';
import { initializeRelatedPanelsManager } from './related_panels_manager';
import type { initializeTrackPanel } from './track_panel';

const mockChildren = {
  panel: { uuid: 'panel' },
  panel2: { uuid: 'panel2' },
  control: {
    uuid: 'control',
    appliedFilters$: new BehaviorSubject({}),
    useGlobalFilters$: new BehaviorSubject(true),
  },
  control2: {
    uuid: 'control2',
    appliedFilters$: new BehaviorSubject({}),
    useGlobalFilters$: new BehaviorSubject(true),
  },
  controlWithoutGlobalFilters: {
    uuid: 'controlWithoutGlobalFilters',
    appliedFilters$: new BehaviorSubject({}),
    useGlobalFilters$: new BehaviorSubject(false),
  },
  esqlControl: {
    uuid: 'esqlControl',
    esqlVariable$: new BehaviorSubject({ key: 'variable' }),
    useGlobalFilters$: new BehaviorSubject(true),
  },
  esqlControl2: {
    uuid: 'esqlControl2',
    esqlVariable$: new BehaviorSubject({ key: 'variable2' }),
    useGlobalFilters$: new BehaviorSubject(true),
  },
  esqlPanel: {
    uuid: 'esqlPanel',
    query$: new BehaviorSubject({ esql: 'FROM index | WHERE field == ?variable' }),
  },
  panelInSection: { uuid: 'panelInSection', sectionId: 'a' },
  controlInSection: {
    uuid: 'controlInSection',
    appliedFilters$: new BehaviorSubject({}),
    useGlobalFilters$: new BehaviorSubject(true),
    sectionId: 'a',
  },
};

const mockSections: Record<string, string> = {
  panelInSection: 'a',
  controlInSection: 'a',
};

const getMockedDeps = () => {
  const mockTrackPanel = {
    focusedPanelId$: new BehaviorSubject<string | undefined>(undefined),
  } as unknown as ReturnType<typeof initializeTrackPanel>;
  const mockLayoutManager = {
    api: {
      getDashboardPanelFromId: jest
        .fn()
        .mockImplementation((uuid) => ({ grid: { sectionId: mockSections[uuid] ?? undefined } })),
      layout$: new BehaviorSubject(undefined),
      children$: new BehaviorSubject(mockChildren),
    },
  } as unknown as ReturnType<typeof initializeLayoutManager>;
  return { mockTrackPanel, mockLayoutManager };
};

describe('initializeRelatedPanelsManager', () => {
  describe('with no focused panel', () => {
    let subscription: Subscription;
    afterEach(() => {
      subscription.unsubscribe();
    });
    const { mockLayoutManager, mockTrackPanel } = getMockedDeps();
    const relatedPanelsManager = initializeRelatedPanelsManager(mockTrackPanel, mockLayoutManager);
    test('should not compute', (done) => {
      subscription = relatedPanelsManager.api.arePanelsRelated$.subscribe(() => {
        expect(mockLayoutManager.api.getDashboardPanelFromId).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('with focused panel', () => {
    const { mockLayoutManager, mockTrackPanel } = getMockedDeps();
    mockTrackPanel.focusedPanelId$.next('panel');

    const relatedPanelsManager = initializeRelatedPanelsManager(mockTrackPanel, mockLayoutManager);

    test('should compute', (done) => {
      relatedPanelsManager.api.arePanelsRelated$.subscribe(() => {
        expect(mockLayoutManager.api.getDashboardPanelFromId).toHaveBeenCalled();
        done();
      });
    });

    const arePanelsRelated = relatedPanelsManager.api.arePanelsRelated$.value;

    test('should mark a panel without a section ID as related to all filter controls without section IDs', () => {
      expect(arePanelsRelated('control', 'panel')).toBe(true);
      expect(arePanelsRelated('control2', 'panel')).toBe(true);
      expect(arePanelsRelated('control', 'panel2')).toBe(true);
      expect(arePanelsRelated('control2', 'panel2')).toBe(true);
    });

    test('should not mark a panel as related to other panels', () => {
      expect(arePanelsRelated('panel', 'panel2')).toBe(false);
      expect(arePanelsRelated('panel', 'panelInSection')).toBe(false);
    });

    test('should not mark a panel without a section ID as related to controls in a section', () => {
      expect(arePanelsRelated('panel', 'controlInSection')).toBe(false);
    });

    test('should mark panels in sections as related to global filter controls, and controls in their section', () => {
      expect(arePanelsRelated('panelInSection', 'controlInSection')).toBe(true);
      expect(arePanelsRelated('panelInSection', 'control')).toBe(true);
      expect(arePanelsRelated('panelInSection', 'control2')).toBe(true);
    });

    test('should not mark panels as related to themselves', () => {
      expect(arePanelsRelated('panel', 'panel')).toBe(false);
    });

    test('should mark ES|QL panels as related to the ES|QL controls whose variables they include', () => {
      expect(arePanelsRelated('esqlPanel', 'esqlControl')).toBe(true);
      expect(arePanelsRelated('esqlPanel', 'esqlControl2')).toBe(false);
    });

    test('should mark controls as related to each other only if they use global filters', () => {
      expect(arePanelsRelated('control', 'control2')).toBe(true);
      expect(arePanelsRelated('control', 'controlWithoutGlobalFilters')).toBe(false);
    });

    test('should compute relations both ways', () => {
      expect(arePanelsRelated('control', 'panel')).toBe(true);
      expect(arePanelsRelated('controlInSection', 'panel')).toBe(false);
      expect(arePanelsRelated('controlInSection', 'panelInSection')).toBe(true);
      expect(arePanelsRelated('esqlControl', 'esqlPanel')).toBe(true);
    });
  });
});
