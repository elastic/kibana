/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeViewModeManager } from './view_mode_manager';
import { mockDashboardBackupService } from '../services/mocks';
import { coreServices } from '../services/kibana_services';

describe('initializeViewModeManager', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDashboardBackupService.dashboardHasUnsavedEdits.mockReturnValue(false);
    mockDashboardBackupService.getViewMode.mockReturnValue('view');
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;
  });

  describe('creating in non-interactive mode', () => {
    test('is non-interactive when explicitly requested', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
        viewMode: 'non-interactive',
      });

      expect(api.viewMode$.getValue()).toBe('non-interactive');
    });

    test('takes precedence over a managed dashboard', () => {
      const { api } = initializeViewModeManager({
        isManaged: true,
        savedObjectId: 'dashboard1',
        viewMode: 'non-interactive',
      });

      expect(api.viewMode$.getValue()).toBe('non-interactive');
    });

    test('takes precedence over incoming embeddables that would otherwise force edit mode', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
        incomingEmbeddables: [{ embeddableId: 'panel1' } as any],
        viewMode: 'non-interactive',
      });

      expect(api.viewMode$.getValue()).toBe('non-interactive');
    });

    test('disableTriggers$ starts out true', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
        viewMode: 'non-interactive',
      });

      expect(api.disableTriggers$.getValue()).toBe(true);
    });
  });

  describe('creating a managed or read-only dashboard', () => {
    test('managed dashboards default to view mode', () => {
      const { api } = initializeViewModeManager({
        isManaged: true,
        savedObjectId: 'dashboard1',
      });

      expect(api.viewMode$.getValue()).toBe('view');
    });

    test('managed dashboards default to view mode even with incoming embeddables', () => {
      const { api } = initializeViewModeManager({
        isManaged: true,
        savedObjectId: 'dashboard1',
        incomingEmbeddables: [{ embeddableId: 'panel1' } as any],
      });

      expect(api.viewMode$.getValue()).toBe('view');
    });

    test('defaults to view mode when the user lacks showWriteControls capability', () => {
      (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;

      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      expect(api.viewMode$.getValue()).toBe('view');
    });

    test('defaults to view mode when the user cannot edit the dashboard', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
        accessControl: { accessMode: 'write_restricted' },
      });

      expect(api.viewMode$.getValue()).toBe('view');
    });

    test('isEditableByUser reflects the access-control check', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
        accessControl: { accessMode: 'write_restricted' },
      });

      expect(api.isEditableByUser).toBe(false);
    });
  });

  describe('creating an ordinary dashboard', () => {
    test('defaults to edit mode for a brand new dashboard (no savedObjectId)', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
      });

      expect(api.viewMode$.getValue()).toBe('edit');
    });

    test('defaults to edit mode when incoming embeddables are present', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
        incomingEmbeddables: [{ embeddableId: 'panel1' } as any],
      });

      expect(api.viewMode$.getValue()).toBe('edit');
    });

    test('defaults to edit mode when the backup service reports unsaved edits', () => {
      mockDashboardBackupService.dashboardHasUnsavedEdits.mockReturnValue(true);

      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      expect(api.viewMode$.getValue()).toBe('edit');
      expect(mockDashboardBackupService.dashboardHasUnsavedEdits).toHaveBeenCalledWith(
        'dashboard1'
      );
    });

    test('otherwise falls back to the view mode persisted by the backup service', () => {
      mockDashboardBackupService.getViewMode.mockReturnValue('edit');

      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      expect(api.viewMode$.getValue()).toBe('edit');
    });

    test('disableTriggers$ starts out false', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      expect(api.disableTriggers$.getValue()).toBe(false);
    });
  });

  describe('setViewMode on a managed dashboard', () => {
    test('blocks transitions into edit mode', () => {
      const { api } = initializeViewModeManager({
        isManaged: true,
        savedObjectId: 'dashboard1',
      });

      api.setViewMode('edit');

      expect(api.viewMode$.getValue()).toBe('view');
    });
  });

  describe('disableTriggers$ synchronization for ordinary dashboards', () => {
    test('flips to true when the view mode transitions to non-interactive', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      expect(api.disableTriggers$.getValue()).toBe(false);

      api.setViewMode('non-interactive');

      expect(api.viewMode$.getValue()).toBe('non-interactive');
      expect(api.disableTriggers$.getValue()).toBe(true);
    });

    test('flips back to false when the view mode leaves non-interactive', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      api.setViewMode('non-interactive');
      expect(api.disableTriggers$.getValue()).toBe(true);

      api.setViewMode('edit');

      expect(api.disableTriggers$.getValue()).toBe(false);
    });

    test('toggles between view and edit mode without ever disabling triggers', () => {
      const { api } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      api.setViewMode('edit');
      expect(api.disableTriggers$.getValue()).toBe(false);

      api.setViewMode('view');
      expect(api.disableTriggers$.getValue()).toBe(false);
    });

    test('stops synchronizing once cleaned up', () => {
      const { api, cleanup } = initializeViewModeManager({
        isManaged: false,
        savedObjectId: 'dashboard1',
      });

      cleanup();
      api.setViewMode('non-interactive');

      expect(api.viewMode$.getValue()).toBe('non-interactive');
      expect(api.disableTriggers$.getValue()).toBe(false);
    });
  });
});
