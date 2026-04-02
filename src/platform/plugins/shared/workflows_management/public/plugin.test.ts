/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
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
    plugin = new WorkflowsPlugin();
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
      // First call: WORKFLOWS_UI_SETTING_ID -> true, second call: WORKFLOWS_AI_AGENT_SETTING_ID -> false
      coreSetup.uiSettings.get.mockReturnValueOnce(true).mockReturnValueOnce(false);

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
    it('should initialize step and trigger schema registries and return an empty object', () => {
      // Setup first (UI disabled path is fine for start testing)
      coreSetup.uiSettings.get.mockReturnValue(false);
      plugin.setup(coreSetup, setupDeps as any);

      const result = plugin.start(coreStart, startDeps as any);

      expect(stepSchemas.initialize).toHaveBeenCalledWith(startDeps.workflowsExtensions);
      expect(triggerSchemas.initialize).toHaveBeenCalledWith(startDeps.workflowsExtensions);
      expect(result).toEqual({});
    });

    it('should subscribe to license changes', () => {
      coreSetup.uiSettings.get.mockReturnValue(false);
      plugin.setup(coreSetup, setupDeps as any);

      const license$ = new BehaviorSubject({
        isActive: true,
        hasAtLeast: jest.fn().mockReturnValue(true),
      });
      startDeps.licensing.license$ = license$ as any;

      plugin.start(coreStart, startDeps as any);

      expect(license$.observed).toBe(true);
    });
  });
});
