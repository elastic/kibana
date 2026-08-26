/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

jest.mock('../../../common/schema', () => {
  const mockWorkflowZodSchema = {};

  return {
    getWorkflowZodSchema: jest.fn(() => mockWorkflowZodSchema),
  };
});

jest.mock('../../trigger_schemas', () => ({
  triggerSchemas: {
    getRegisteredIds: jest.fn(() => []),
  },
}));

jest.mock('../../shared/ui/yaml_editor/yaml_language_service', () => ({
  yamlLanguageService: {
    update: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('./apply_workflow_yaml_validation_to_editor', () => ({
  applyWorkflowYamlValidationToEditor: jest.fn(() =>
    Promise.resolve({ validationResults: [], yamlDocument: null })
  ),
  applyValidationHighlightsToEditor: jest.fn(),
}));

jest.mock('./collect_yaml_schema_validation_results', () => ({
  collectYamlSchemaValidationResults: jest.fn(() => []),
  mergeWorkflowYamlValidationResults: (
    customResults: YamlValidationResult[],
    yamlResults: YamlValidationResult[]
  ) => [...customResults, ...yamlResults],
}));

jest.mock('../validate_workflow_yaml/model/use_workflow_json_schema', () => ({
  useWorkflowJsonSchema: jest.fn(() => ({
    jsonSchema: { type: 'object' },
    uri: 'file:///workflow-schema.json',
  })),
}));

jest.mock('../validate_workflow_yaml/lib/use_workflow_yaml_validation_context', () => {
  const mockValidationContextRef = {
    current: {
      connectorTypes: {},
      connectorsManagementUrl: 'http://test/connectors',
      workflows: { workflows: {}, totalWorkflows: 0 },
      getPropertyHandler: () => undefined,
      esqlCallbacks: {},
    },
  };

  return {
    useWorkflowYamlValidationContextRef: jest.fn(() => mockValidationContextRef),
  };
});

jest.mock('../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: jest.fn(() => ({ connectorTypes: {} })),
}));

jest.mock('./wait_for_yaml_schema_markers_after_update', () => ({
  waitForPreviewYamlSchemaMarkers: jest.fn(async (_model, schemas: unknown[]) => {
    const { yamlLanguageService } = jest.requireMock(
      '../../shared/ui/yaml_editor/yaml_language_service'
    ) as { yamlLanguageService: { update: jest.Mock } };

    if (schemas.length > 0) {
      await yamlLanguageService.update(schemas);
    }
  }),
}));

jest.mock('../../widgets/workflow_yaml_editor/lib/utils', () => ({
  navigateToErrorPosition: jest.fn(),
}));

jest.mock('@kbn/code-editor', () => {
  const { setPreviewValidationMarkerChangeListener } = jest.requireActual(
    './use_workflow_change_history_preview_validation_test_harness'
  ) as typeof import('./use_workflow_change_history_preview_validation_test_harness');

  return {
    monaco: {
      editor: {
        onDidChangeMarkers: jest.fn((listener: (uris: monaco.Uri[]) => void) => {
          setPreviewValidationMarkerChangeListener(listener);
          return { dispose: jest.fn() };
        }),
        setModelMarkers: jest.fn(),
        getModelMarkers: jest.fn(() => []),
      },
    },
  };
});

export {};
