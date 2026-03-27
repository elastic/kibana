/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SUB_ACTION, TASK_TYPE_BY_SUB_ACTION } from '@kbn/connector-schemas/inference/constants';
import {
  getConnectorTypesFromStepType,
  getCustomStepConnectorIdSelectionHandler,
  getInferenceConnectorTaskTypeFromSubAction,
  isCreateConnectorEnabledForStepType,
} from './connectors_utils';
import { stepSchemas } from '../../../common/step_schemas';

jest.mock('../../../common/step_schemas', () => ({
  stepSchemas: {
    getStepDefinition: jest.fn(),
  },
}));

const mockGetStepDefinition = stepSchemas.getStepDefinition as jest.MockedFunction<
  typeof stepSchemas.getStepDefinition
>;

describe('getCustomStepConnectorIdSelectionHandler', () => {
  beforeEach(() => {
    mockGetStepDefinition.mockReset();
  });

  it('returns undefined when step definition is not found', () => {
    mockGetStepDefinition.mockReturnValue(undefined);
    expect(getCustomStepConnectorIdSelectionHandler('unknown.step')).toBeUndefined();
  });

  it('returns undefined when step definition has no editorHandlers', () => {
    mockGetStepDefinition.mockReturnValue({} as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(getCustomStepConnectorIdSelectionHandler('my.step')).toBeUndefined();
  });

  it('returns undefined when editorHandlers has no config', () => {
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: {},
    } as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(getCustomStepConnectorIdSelectionHandler('my.step')).toBeUndefined();
  });

  it('returns undefined when config has no connector-id property', () => {
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: { config: {} },
    } as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(getCustomStepConnectorIdSelectionHandler('my.step')).toBeUndefined();
  });

  it('returns the connectorIdSelection handler when present', () => {
    const handler = { connectorTypes: ['.myConnector'], enableCreation: true };
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: {
        config: {
          'connector-id': { connectorIdSelection: handler },
        },
      },
    } as unknown as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(getCustomStepConnectorIdSelectionHandler('my.step')).toBe(handler);
  });
});

describe('getConnectorTypesFromStepType', () => {
  beforeEach(() => {
    mockGetStepDefinition.mockReset();
  });

  it('returns connectorTypes from the custom handler when defined', () => {
    const connectorTypes = ['.inference', '.openai'];
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: {
        config: {
          'connector-id': { connectorIdSelection: { connectorTypes } },
        },
      },
    } as unknown as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(getConnectorTypesFromStepType('custom.step')).toEqual(connectorTypes);
  });

  it('falls back to [stepType] when no custom handler is defined', () => {
    mockGetStepDefinition.mockReturnValue(undefined);
    expect(getConnectorTypesFromStepType('.slack.postMessage')).toEqual(['.slack.postMessage']);
  });
});

describe('isCreateConnectorEnabledForStepType', () => {
  beforeEach(() => {
    mockGetStepDefinition.mockReset();
  });

  it('returns true when no custom handler is defined (regular connector step)', () => {
    mockGetStepDefinition.mockReturnValue(undefined);
    expect(isCreateConnectorEnabledForStepType('.slack.postMessage')).toBe(true);
  });

  it('returns false when custom handler exists but enableCreation is not set', () => {
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: {
        config: {
          'connector-id': {
            connectorIdSelection: { connectorTypes: ['.inference'] },
          },
        },
      },
    } as unknown as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(isCreateConnectorEnabledForStepType('custom.step')).toBe(false);
  });

  it('returns false when custom handler has enableCreation explicitly set to false', () => {
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: {
        config: {
          'connector-id': {
            connectorIdSelection: {
              connectorTypes: ['.inference'],
              enableCreation: false,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(isCreateConnectorEnabledForStepType('custom.step')).toBe(false);
  });

  it('returns true when custom handler has enableCreation set to true', () => {
    mockGetStepDefinition.mockReturnValue({
      editorHandlers: {
        config: {
          'connector-id': {
            connectorIdSelection: {
              connectorTypes: ['.inference'],
              enableCreation: true,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof stepSchemas.getStepDefinition>);
    expect(isCreateConnectorEnabledForStepType('custom.step')).toBe(true);
  });
});

describe('getInferenceConnectorTaskTypeFromSubAction', () => {
  it.each([
    [SUB_ACTION.UNIFIED_COMPLETION, 'chat_completion'],
    [SUB_ACTION.UNIFIED_COMPLETION_STREAM, 'chat_completion'],
    [SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR, 'chat_completion'],
    [SUB_ACTION.COMPLETION, 'completion'],
    [SUB_ACTION.COMPLETION_STREAM, 'completion'],
    [SUB_ACTION.RERANK, 'rerank'],
    [SUB_ACTION.TEXT_EMBEDDING, 'text_embedding'],
    [SUB_ACTION.SPARSE_EMBEDDING, 'sparse_embedding'],
  ])('maps sub-action "%s" to task type "%s"', (subAction, expectedTaskType) => {
    expect(getInferenceConnectorTaskTypeFromSubAction(subAction)).toBe(expectedTaskType);
  });

  it('returns undefined for unknown sub-action', () => {
    expect(getInferenceConnectorTaskTypeFromSubAction('unknown_action')).toBeUndefined();
  });

  it('is consistent with the TASK_TYPE_BY_SUB_ACTION constant', () => {
    for (const [subAction, taskType] of Object.entries(TASK_TYPE_BY_SUB_ACTION)) {
      expect(getInferenceConnectorTaskTypeFromSubAction(subAction)).toBe(taskType);
    }
  });
});
