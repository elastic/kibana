/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { monaco } from '@kbn/code-editor';
import type { YamlValidationResult } from '@kbn/workflows-yaml';

vi.mock('../../../common/schema', () => {
  const mockWorkflowZodSchema = {};

  return {
    getWorkflowZodSchema: vi.fn(() => mockWorkflowZodSchema),
  };
});

vi.mock('../../trigger_schemas', () => {
  const mocked = {
    triggerSchemas: {
      getRegisteredIds: vi.fn(() => []),
      getRegisteredTriggersForSchema: vi.fn(() => []),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../shared/ui/yaml_editor/yaml_language_service', () => {
  const mocked = {
    yamlLanguageService: {
      update: vi.fn(() => Promise.resolve()),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('./apply_workflow_yaml_validation_to_editor', () => {
  const mocked = {
    applyWorkflowYamlValidationToEditor: vi.fn(() =>
      Promise.resolve({ validationResults: [], yamlDocument: null })
    ),
    applyValidationHighlightsToEditor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./collect_yaml_schema_validation_results', () => {
  const mocked = {
    collectYamlSchemaValidationResults: vi.fn(() => []),
    mergeWorkflowYamlValidationResults: (
      customResults: YamlValidationResult[],
      yamlResults: YamlValidationResult[]
    ) => [...customResults, ...yamlResults],
  };
  return { ...mocked, default: mocked };
});

vi.mock('../validate_workflow_yaml/model/use_workflow_json_schema', () => {
  const mocked = {
    useWorkflowJsonSchema: vi.fn(() => ({
      jsonSchema: { type: 'object' },
      uri: 'file:///workflow-schema.json',
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../validate_workflow_yaml/lib/use_workflow_yaml_validation_context', () => {
  const mockValidationContextRef = {
    current: {
      connectorTypes: { status: 'ready', value: {} },
      connectorsManagementUrl: 'http://test/connectors',
      workflows: { workflows: {}, totalWorkflows: 0 },
      getPropertyHandler: () => undefined,
      esqlCallbacks: {},
    },
  };

  return {
    useWorkflowYamlValidationContextRef: vi.fn(() => mockValidationContextRef),
    getWorkflowYamlValidationContextError: vi.fn(() => null),
  };
});

vi.mock('../../entities/connectors/model/use_available_connectors', () => {
  const mocked = {
    useAvailableConnectors: vi.fn(() => ({ connectorTypes: {} })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./wait_for_yaml_schema_markers_after_update', () => {
  const mocked = {
    waitForPreviewYamlSchemaMarkers: vi.fn(async (_model, schemas: unknown[]) => {
      const { yamlLanguageService } = (await vi.importMock(
        '../../shared/ui/yaml_editor/yaml_language_service'
      )) as { yamlLanguageService: { update: Mock } };

      if (schemas.length > 0) {
        await yamlLanguageService.update(schemas);
      }
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../widgets/workflow_yaml_editor/lib/utils', () => {
  const mocked = {
    navigateToErrorPosition: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/code-editor', async () => {
  const { setPreviewValidationMarkerChangeListener } = (await vi.importActual(
    './use_workflow_change_history_preview_validation_test_harness'
  )) as typeof import('./use_workflow_change_history_preview_validation_test_harness');

  return {
    monaco: {
      editor: {
        onDidChangeMarkers: vi.fn((listener: (uris: monaco.Uri[]) => void) => {
          setPreviewValidationMarkerChangeListener(listener);
          return { dispose: vi.fn() };
        }),
        setModelMarkers: vi.fn(),
        getModelMarkers: vi.fn(() => []),
      },
    },
  };
});

export {};
