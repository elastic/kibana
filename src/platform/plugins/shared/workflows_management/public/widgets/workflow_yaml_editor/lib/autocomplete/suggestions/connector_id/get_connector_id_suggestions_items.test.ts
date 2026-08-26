/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import {
  getConnectorIdSuggestionsItems,
  getConnectorInstancesForType,
} from './get_connector_id_suggestions_items';

jest.mock('../../../../../../shared/lib/action_type_utils', () => ({
  getActionTypeIdFromStepType: jest.fn((stepType: string) => `.${stepType.split('.')[0]}`),
  getActionTypeDisplayNameFromStepType: jest.fn((stepType: string) => {
    const name = stepType.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }),
}));

jest.mock('../../../../../../shared/lib/connectors_utils', () => ({
  getConnectorTypesFromStepType: jest.fn((stepType: string) => [stepType]),
  getCustomStepConnectorIdSelectionHandler: jest.fn().mockReturnValue(undefined),
  getInferenceConnectorTaskTypeFromSubAction: jest.fn().mockReturnValue(undefined),
  isCreateConnectorEnabledForStepType: jest.fn().mockReturnValue(false),
}));

const {
  isCreateConnectorEnabledForStepType,
  getCustomStepConnectorIdSelectionHandler,
  getInferenceConnectorTaskTypeFromSubAction,
} = jest.requireMock('../../../../../../shared/lib/connectors_utils');

const createMockRange = (): monaco.IRange => ({
  startLineNumber: 3,
  endLineNumber: 3,
  startColumn: 17,
  endColumn: 17,
});

const createMockDynamicConnectorTypes = (): Record<string, ConnectorTypeInfo> => ({
  '.slack': {
    actionTypeId: '.slack',
    displayName: 'Slack',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    subActions: [],
    instances: [
      {
        id: 'slack-001',
        name: 'Engineering Slack',
        isPreconfigured: false,
        isDeprecated: false,
      },
      {
        id: 'slack-002',
        name: 'Alerts Slack',
        isPreconfigured: true,
        isDeprecated: false,
      },
      {
        id: 'slack-003',
        name: 'Old Slack',
        isPreconfigured: false,
        isDeprecated: true,
      },
    ],
  },
  '.email': {
    actionTypeId: '.email',
    displayName: 'Email',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    subActions: [],
    instances: [
      {
        id: 'email-001',
        name: 'Team Email',
        isPreconfigured: false,
        isDeprecated: false,
      },
    ],
  },
  '.inference': {
    actionTypeId: '.inference',
    displayName: 'Inference',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    subActions: [],
    instances: [
      {
        id: 'inf-001',
        name: 'OpenAI',
        isPreconfigured: false,
        isDeprecated: false,
        config: { taskType: 'completion' },
      },
      {
        id: 'inf-002',
        name: 'Embeddings Model',
        isPreconfigured: false,
        isDeprecated: false,
        config: { taskType: 'text_embedding' },
      },
    ],
  },
});

describe('getConnectorIdSuggestionsItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isCreateConnectorEnabledForStepType.mockReturnValue(false);
    getCustomStepConnectorIdSelectionHandler.mockReturnValue(undefined);
    getInferenceConnectorTaskTypeFromSubAction.mockReturnValue(undefined);
  });

  it('should return suggestions for available connector instances', () => {
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].insertText).toBe('slack-001');
    expect(suggestions[0].label).toContain('Engineering Slack');
    expect(suggestions[0].label).toContain('slack-001');
  });

  it('should mark deprecated connectors appropriately', () => {
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    const deprecatedSuggestion = suggestions.find((s) => s.insertText === 'slack-003');
    expect(deprecatedSuggestion).toBeDefined();
    expect((deprecatedSuggestion?.label as string) ?? '').toContain('deprecated');
    expect(deprecatedSuggestion?.sortText).toMatch(/^z/);
    expect(deprecatedSuggestion?.preselect).toBe(false);
  });

  it('should mark preconfigured connectors appropriately', () => {
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    const preconfiguredSuggestion = suggestions.find((s) => s.insertText === 'slack-002');
    expect(preconfiguredSuggestion).toBeDefined();
    expect((preconfiguredSuggestion?.label as string) ?? '').toContain('preconfigured');
  });

  it('should sort active connectors before deprecated ones', () => {
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    const activeSortText = suggestions.find((s) => s.insertText === 'slack-001')?.sortText ?? '';
    const deprecatedSortText =
      suggestions.find((s) => s.insertText === 'slack-003')?.sortText ?? '';
    expect(activeSortText < deprecatedSortText).toBe(true);
  });

  it('should return empty array when no dynamic connector types are provided', () => {
    const range = createMockRange();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, undefined);
    expect(suggestions).toEqual([]);
  });

  it('should return empty array when connector type has no instances', () => {
    const range = createMockRange();
    const dynamicConnectorTypes: Record<string, ConnectorTypeInfo> = {
      '.empty': {
        actionTypeId: '.empty',
        displayName: 'Empty',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        subActions: [],
        instances: [],
      },
    };

    const suggestions = getConnectorIdSuggestionsItems('empty', range, dynamicConnectorTypes);
    expect(suggestions).toEqual([]);
  });

  it('should include a "Create connector" suggestion when creation is enabled', () => {
    isCreateConnectorEnabledForStepType.mockReturnValue(true);
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    const createSuggestion = suggestions.find((s) => s.insertText === '');
    expect(createSuggestion).toBeDefined();
    expect(createSuggestion?.label).toBe('Create a new connector');
    expect(createSuggestion?.command).toBeDefined();
    expect(createSuggestion?.command?.id).toBe('workflows.editor.action.createConnector');
  });

  it('should not include "Create connector" when creation is disabled', () => {
    isCreateConnectorEnabledForStepType.mockReturnValue(false);
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    const createSuggestion = suggestions.find((s) => s.insertText === '');
    expect(createSuggestion).toBeUndefined();
  });

  it('should use CompletionItemKind.Value for connector instances', () => {
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    suggestions.forEach((s) => {
      if (s.insertText !== '') {
        expect(s.kind).toBe(monaco.languages.CompletionItemKind.Value);
      }
    });
  });

  it('should include filterText with both id and name for better searchability', () => {
    const range = createMockRange();
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const suggestions = getConnectorIdSuggestionsItems('slack', range, dynamicConnectorTypes);

    const firstSuggestion = suggestions[0];
    expect(firstSuggestion.filterText).toContain('slack-001');
    expect(firstSuggestion.filterText).toContain('Engineering Slack');
  });
});

describe('getConnectorInstancesForType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCustomStepConnectorIdSelectionHandler.mockReturnValue(undefined);
    getInferenceConnectorTaskTypeFromSubAction.mockReturnValue(undefined);
  });

  it('should return empty array when dynamicConnectorTypes is undefined', () => {
    const result = getConnectorInstancesForType('slack');
    expect(result).toEqual([]);
  });

  it('should return connector instances for a matching step type', () => {
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();
    const result = getConnectorInstancesForType('slack', dynamicConnectorTypes);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('slack-001');
    expect(result[0].connectorType).toBe('.slack');
  });

  it('should return empty array when no matching connector type is found', () => {
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();
    const result = getConnectorInstancesForType('nonexistent', dynamicConnectorTypes);

    expect(result).toEqual([]);
  });

  it('should filter inference connectors by task type when sub-action is specified', () => {
    getInferenceConnectorTaskTypeFromSubAction.mockReturnValue('completion');
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();

    const result = getConnectorInstancesForType('inference.completion', dynamicConnectorTypes);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('inf-001');
  });

  it('should handle step types with leading dots', () => {
    const dynamicConnectorTypes = createMockDynamicConnectorTypes();
    const result = getConnectorInstancesForType('.slack', dynamicConnectorTypes);

    expect(result).toHaveLength(3);
  });
});
