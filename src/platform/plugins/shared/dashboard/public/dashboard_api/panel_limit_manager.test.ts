/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { MAX_CONTROLS_GROUP_SIZE } from '@kbn/controls-constants';
import { MAX_PANELS } from '../../common/constants';
import { initializePanelLimitManager } from './panel_limit_manager';

describe('initializePanelLimitManager', () => {
  it('emits updated state when top-level panels are added/removed', () => {
    const anyStateChange$ = new BehaviorSubject<void>(undefined);

    let currentPanelsCount = 0;
    const serializeLayout = () => {
      return {
        panels: Array.from({ length: currentPanelsCount }, (_, i) => ({
          id: `p-${i}`,
          type: 'testPanel',
          grid: { x: 0, y: i, w: 1, h: 1 },
          config: {},
        })),
        pinned_panels: [],
      };
    };

    const manager = initializePanelLimitManager({
      dashboardInternalApi: {
        anyStateChange$: anyStateChange$.asObservable(),
        serializeLayout,
      },
    });

    expect(manager.panelLimitState$.value.isValid).toBe(true);

    currentPanelsCount = MAX_PANELS + 1;
    anyStateChange$.next();

    expect(manager.panelLimitState$.value.isValid).toBe(false);
    expect(manager.panelLimitState$.value.topLevel.exceeded).toBe(true);

    currentPanelsCount = MAX_PANELS;
    anyStateChange$.next();

    expect(manager.panelLimitState$.value.isValid).toBe(true);
    expect(manager.panelLimitState$.value.topLevel.exceeded).toBe(false);

    manager.cleanup();
  });

  it('emits updated state when section and pinned-panels validity changes', () => {
    const anyStateChange$ = new BehaviorSubject<void>(undefined);

    let sectionOverflow = false;
    let pinnedPanelsCount = 0;

    const serializeLayout = () => {
      return {
        panels: sectionOverflow
          ? [
              {
                id: 'section-1',
                title: 'Section',
                collapsed: false,
                grid: { y: 0 },
                panels: Array.from({ length: MAX_PANELS + 1 }, (_, i) => ({
                  id: `c-${i}`,
                  type: 'testPanel',
                  grid: { x: 0, y: i, w: 1, h: 1 },
                  config: {},
                })),
              },
            ]
          : [],
        pinned_panels: Array.from({ length: pinnedPanelsCount }, (_, i) => ({
          id: `control-${i}`,
          type: 'options_list_control',
          width: 'medium',
          grow: false,
          config: {},
        })),
      };
    };

    const manager = initializePanelLimitManager({
      dashboardInternalApi: {
        anyStateChange$: anyStateChange$.asObservable(),
        serializeLayout,
      },
    });

    expect(manager.panelLimitState$.value.isValid).toBe(true);

    sectionOverflow = true;
    anyStateChange$.next();

    expect(manager.panelLimitState$.value.isValid).toBe(false);
    expect(manager.panelLimitState$.value.sectionViolations).toHaveLength(1);

    sectionOverflow = false;
    pinnedPanelsCount = MAX_CONTROLS_GROUP_SIZE + 1;
    anyStateChange$.next();

    expect(manager.panelLimitState$.value.isValid).toBe(false);
    expect(manager.panelLimitState$.value.pinnedPanels.exceeded).toBe(true);

    pinnedPanelsCount = MAX_CONTROLS_GROUP_SIZE;
    anyStateChange$.next();

    expect(manager.panelLimitState$.value.isValid).toBe(true);
    expect(manager.panelLimitState$.value.pinnedPanels.exceeded).toBe(false);

    manager.cleanup();
  });
});
