/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, skip } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { initializeControlGroupManager } from './control_group_manager';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';
import type { initializeLayoutManager } from './layout_manager';
import type { DashboardChildren } from './layout_manager/types';
import type { DashboardSettings, DashboardState } from '../../common';
import { isDashboardSection } from '../../common';
import { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';
import type { DashboardPanel } from '../../server';

jest.mock('../services/dashboard_backup_service', () => ({}));

const controlGroupApi = {
  hasUnsavedChanges$: new BehaviorSubject(false),
};
const controlGroupManagerMock = {
  api: {
    controlGroupApi$: new BehaviorSubject(controlGroupApi),
  },
  internalApi: {
    serializeControlGroup: () => ({
      controlGroupInput: {},
      controlGroupReferences: [],
    }),
  },
} as unknown as ReturnType<typeof initializeControlGroupManager>;
const layoutUnsavedChanges$ = new BehaviorSubject<{ panels?: DashboardState['panels'] }>({});
const layoutManagerMock = {
  api: {
    children$: new BehaviorSubject<DashboardChildren>({}),
  },
  internalApi: {
    startComparing$: () => layoutUnsavedChanges$,
    serializeLayout: () => {
      const panels = layoutUnsavedChanges$.getValue()?.panels ?? [];
      return {
        panels,
        // create one reference per panel
        references: panels
          .filter((panel) => !isDashboardSection(panel))
          .map((panel, index) => ({
            name: 'savedObjectRef',
            type: (panel as DashboardPanel).type,
            id: `savedObject${index + 1}`,
          })),
      };
    },
  },
} as unknown as ReturnType<typeof initializeLayoutManager>;
const settingsManagerMock = {
  internalApi: {
    startComparing$: () => new BehaviorSubject<Partial<DashboardSettings>>({}),
  },
} as unknown as ReturnType<typeof initializeSettingsManager>;
const unifiedSearchManagerMock = {
  internalApi: {
    startComparing$: () =>
      new BehaviorSubject<
        Partial<Pick<DashboardState, 'filters' | 'query' | 'refreshInterval' | 'timeRange'>>
      >({}),
  },
} as unknown as ReturnType<typeof initializeUnifiedSearchManager>;
const getReferences = () => [];
const savedObjectId$ = new BehaviorSubject<string | undefined>('dashboard1234');
const viewMode$ = new BehaviorSubject<ViewMode>('edit');

const setBackupStateMock = jest.fn();

describe('unsavedChangesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    layoutUnsavedChanges$.next({});

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/dashboard_backup_service').getDashboardBackupService = () => ({
      setState: setBackupStateMock,
    });
  });

  describe('onUnsavedChanges', () => {
    describe('onSettingsChanges', () => {
      test('should have unsaved changes when tags change', (done) => {
        const settingsManager = initializeSettingsManager();
        const unsavedChangesManager = initializeUnsavedChangesManager({
          viewMode$,
          storeUnsavedChanges: false,
          controlGroupManager: controlGroupManagerMock,
          lastSavedState: DEFAULT_DASHBOARD_STATE,
          layoutManager: layoutManagerMock,
          savedObjectId$,
          settingsManager,
          unifiedSearchManager: unifiedSearchManagerMock,
          getReferences,
        });

        unsavedChangesManager.api.hasUnsavedChanges$
          .pipe(skip(1))
          .subscribe((hasUnsavedChanges) => {
            expect(hasUnsavedChanges).toBe(true);
            done();
          });

        settingsManager.api.setTags(['New tag']);
      });
    });

    describe('session state', () => {
      test('should backup unsaved panel changes and references when only layout changes', (done) => {
        initializeUnsavedChangesManager({
          viewMode$,
          storeUnsavedChanges: true,
          controlGroupManager: controlGroupManagerMock,
          lastSavedState: DEFAULT_DASHBOARD_STATE,
          layoutManager: layoutManagerMock,
          savedObjectId$,
          settingsManager: settingsManagerMock,
          unifiedSearchManager: unifiedSearchManagerMock,
          getReferences,
        });

        setBackupStateMock.mockImplementation((id, backupState) => {
          expect(id).toBe(savedObjectId$.value);
          expect(backupState).toMatchInlineSnapshot(`
            Object {
              "panels": Array [
                Object {
                  "config": Object {
                    "title": "New panel",
                  },
                  "type": "testType",
                },
              ],
              "references": Array [
                Object {
                  "id": "savedObject1",
                  "name": "savedObjectRef",
                  "type": "testType",
                },
              ],
              "viewMode": "edit",
            }
          `);
          done();
        });

        layoutUnsavedChanges$.next({
          panels: [
            {
              type: 'testType',
              config: {
                title: 'New panel',
              },
            } as unknown as DashboardPanel,
          ],
        });
      });
    });
  });
});
