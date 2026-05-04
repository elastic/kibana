/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { App, AppUpdatableFields, AppUpdater } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows/common/constants';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { WorkflowsPlugin } from './plugin';
import { triggerSchemas } from './trigger_schemas';
import { PLUGIN_ID } from '../common';
import { stepSchemas } from '../common/step_schemas';

jest.mock('./common/lib/telemetry/telemetry_service', () => {
  return {
    TelemetryService: jest.fn().mockImplementation(() => ({
      setup: jest.fn(),
      getClient: jest.fn().mockReturnValue({ reportEvent: jest.fn() }),
    })),
  };
});

jest.mock('../common/step_schemas', () => ({
  stepSchemas: { initialize: jest.fn() },
}));

jest.mock('./trigger_schemas', () => ({
  triggerSchemas: { initialize: jest.fn() },
}));

jest.mock('./connectors/workflows', () => ({
  getWorkflowsConnectorType: jest.fn(() => ({ id: 'workflows', actionTypeId: 'workflows' })),
}));

describe('WorkflowsPlugin', () => {
  let plugin: WorkflowsPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let setupDeps: {
    triggersActionsUi: { actionTypeRegistry: { register: jest.Mock } };
  };
  let startDeps: {
    workflowsExtensions: ReturnType<typeof workflowsExtensionsMock.createStart>;
    licensing: ReturnType<typeof licensingMock.createStart>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new WorkflowsPlugin(coreMock.createPluginInitializerContext());
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();
    setupDeps = {
      triggersActionsUi: { actionTypeRegistry: { register: jest.fn() } },
    };
    startDeps = {
      workflowsExtensions: workflowsExtensionsMock.createStart(),
      licensing: licensingMock.createStart(),
    };
  });

  describe('setup()', () => {
    it('should return an empty object when workflows UI is disabled', () => {
      coreSetup.uiSettings.get.mockReturnValue(false);

      const result = plugin.setup(coreSetup, setupDeps as any);

      expect(result).toEqual({});
      expect(coreSetup.application.register).not.toHaveBeenCalled();
    });

    it('should register the workflows app when workflows UI is enabled', () => {
      coreSetup.uiSettings.get.mockReturnValueOnce(true);

      const result = plugin.setup(coreSetup, setupDeps as any);

      expect(coreSetup.application.register).toHaveBeenCalledTimes(1);
      expect(coreSetup.application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: PLUGIN_ID,
          title: 'Workflows',
          appRoute: '/app/workflows',
        })
      );
      expect(result).toEqual({});
    });
  });

  describe('start()', () => {
    it('should initialize step and trigger schema registries', () => {
      // Setup first (UI disabled path is fine for start testing)
      coreSetup.uiSettings.get.mockReturnValue(false);
      plugin.setup(coreSetup, setupDeps as any);

      plugin.start(coreStart, startDeps as any);

      expect(stepSchemas.initialize).toHaveBeenCalledWith(startDeps.workflowsExtensions);
      expect(triggerSchemas.initialize).toHaveBeenCalledWith(startDeps.workflowsExtensions);
    });

    describe('app visibility (visibleIn)', () => {
      const setReadCapability = (canReadWorkflow: boolean) => {
        coreStart.application.capabilities = {
          ...coreStart.application.capabilities,
          [WORKFLOWS_MANAGEMENT_FEATURE_ID]: { readWorkflow: canReadWorkflow },
        } as any;
      };

      const setLicenseValid = (isValid: boolean) => {
        startDeps.licensing.license$ = new BehaviorSubject({
          isActive: true,
          isAvailable: true,
          hasAtLeast: jest.fn().mockReturnValue(isValid),
        }) as any;
      };

      /**
       * Registers the workflows app via setup() and subscribes to its updater$
       * before start() runs, so the synchronous emission triggered by
       * subscribeAppVisibilityChanges() is captured.
       */
      const captureAppUpdates = (): Array<Partial<AppUpdatableFields>> => {
        coreSetup.uiSettings.get.mockReturnValue(true);
        plugin.setup(coreSetup, setupDeps as any);

        const registeredApp = coreSetup.application.register.mock.calls[0][0] as App;
        const updates: Array<Partial<AppUpdatableFields>> = [];
        registeredApp.updater$!.subscribe((updater: AppUpdater) => {
          const fields = updater({} as App);
          if (fields) updates.push(fields);
        });
        return updates;
      };

      it('should make the app visible everywhere when authorized and available', () => {
        setReadCapability(true);
        setLicenseValid(true);
        const updates = captureAppUpdates();

        plugin.start(coreStart, startDeps as any);

        expect(updates).toHaveLength(1);
        expect(updates[0].visibleIn).toEqual(['globalSearch', 'home', 'kibanaOverview', 'sideNav']);
      });

      it('should hide the app from sideNav when the user lacks read capability', () => {
        setReadCapability(false);
        setLicenseValid(true);
        const updates = captureAppUpdates();

        plugin.start(coreStart, startDeps as any);

        expect(updates).toHaveLength(1);
        expect(updates[0].visibleIn).toEqual(['globalSearch']);
        expect(updates[0].visibleIn).not.toContain('sideNav');
      });

      it('should keep the app in sideNav and globalSearch when authorized but unavailable', () => {
        setReadCapability(true);
        setLicenseValid(false);
        const updates = captureAppUpdates();

        plugin.start(coreStart, startDeps as any);

        expect(updates).toHaveLength(1);
        expect(updates[0].visibleIn).toEqual(['globalSearch', 'sideNav']);
      });

      it('should hide the app from sideNav for unauthorized users even when unavailable', () => {
        setReadCapability(false);
        setLicenseValid(false);
        const updates = captureAppUpdates();

        plugin.start(coreStart, startDeps as any);

        expect(updates).toHaveLength(1);
        expect(updates[0].visibleIn).toEqual(['globalSearch', 'sideNav']);
      });
    });
  });
});
