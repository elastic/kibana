/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getSampleDashboardState } from '../mocks';
import type { DashboardState } from '../../common';
import { initializeSettingsManager } from './settings_manager';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';

describe('initializeSettingsManager', () => {
  describe('default values', () => {
    test('Should set syncCursor to false when value not provided', () => {
      const settingsManager = initializeSettingsManager({
        title: 'dashboard 1',
        panels: [],
      });
      expect(settingsManager.api.getSettings().syncColors).toBe(false);
    });

    test('Should set syncTooltips to false when value not provided', () => {
      const settingsManager = initializeSettingsManager({
        title: 'dashboard 1',
        panels: [],
      });
      expect(settingsManager.api.getSettings().syncTooltips).toBe(false);
    });
  });

  describe('setSettings', () => {
    test('Should not overwrite settings when setting partial state', () => {
      const settingsManager = initializeSettingsManager({
        title: 'dashboard 1',
        panels: [],
        options: {
          ...DEFAULT_DASHBOARD_OPTIONS,
          useMargins: false,
        },
      });
      settingsManager.api.setSettings({ timeRestore: true });
      const settings = settingsManager.api.getSettings();
      expect(settings.timeRestore).toBe(true);
      expect(settings.useMargins).toBe(false);
    });
  });

  describe('startComparing$', () => {
    test('Should return no changes when there are no changes', (done) => {
      const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
      const settingsManager = initializeSettingsManager(lastSavedState$.value);
      settingsManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
        expect(changes).toMatchInlineSnapshot(`Object {}`);
        done();
      });
    });

    test('Should return timeRestore change when timeRestoreChanges', (done) => {
      const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
      const settingsManager = initializeSettingsManager(lastSavedState$.value);
      settingsManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
        expect(changes).toMatchInlineSnapshot(`
          Object {
            "timeRestore": false,
          }
        `);
        done();
      });
      const currentSettings = settingsManager.api.getSettings();
      settingsManager.api.setSettings({
        ...currentSettings,
        timeRestore: !currentSettings.timeRestore,
      });
    });

    test('Should return only changed keys when there are changes', (done) => {
      const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
      const settingsManager = initializeSettingsManager(lastSavedState$.value);
      settingsManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
        expect(changes).toMatchInlineSnapshot(`
          Object {
            "options": Object {
              "hidePanelTitles": true,
              "syncColors": false,
              "syncCursor": true,
              "syncTooltips": false,
              "useMargins": true,
            },
            "title": "updated title",
          }
        `);
        done();
      });
      const currentSettings = settingsManager.api.getSettings();
      settingsManager.api.setSettings({
        ...currentSettings,
        title: 'updated title',
        hidePanelTitles: !currentSettings.hidePanelTitles,
      });
    });
  });
});
