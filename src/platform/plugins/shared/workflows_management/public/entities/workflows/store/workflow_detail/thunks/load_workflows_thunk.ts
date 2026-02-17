/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { LegacyWorkflowInput, WorkflowListDto } from '@kbn/workflows';
import type { WorkflowsServices } from '../../../../../types';
import type { WorkflowsResponse } from '../../../model/types';
import type { RootState } from '../../types';
import { initialWorkflowsState, setWorkflows } from '../slice';

/**
 * Maximum number of workflows to fetch for autocomplete/lookup.
 * Single fetch keeps the thunk simple; pagination could be added later if needed.
 */
const MAX_WORKFLOWS_LOOKUP_SIZE = 1000;

export type LoadWorkflowsParams = void;
export type LoadWorkflowsResponse = WorkflowsResponse;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body?: { message?: string } }).body;
    if (body?.message && typeof body.message === 'string') {
      return body.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Failed to load workflows';
}

/** JSON Schema property shape (subset used for workflow inputs). */
interface JsonSchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minItems?: number;
  maxItems?: number;
}

/**
 * Converts JSON Schema inputs format (properties + required) to legacy array format
 * so autocomplete can suggest input names and placeholders.
 */
function jsonSchemaInputsToLegacy(inputs: {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}): LegacyWorkflowInput[] {
  const { properties = {}, required = [] } = inputs;
  const result: LegacyWorkflowInput[] = [];
  for (const [name, prop] of Object.entries(properties)) {
    const isRequired = required.includes(name);
    const description = prop?.description;
    const defaultVal = prop?.default;
    if (prop?.enum) {
      result.push({
        name,
        type: 'choice',
        options: prop.enum,
        description,
        default: typeof defaultVal === 'string' ? defaultVal : undefined,
        required: isRequired,
      });
    } else if (prop?.type === 'array') {
      result.push({
        name,
        type: 'array',
        description,
        minItems: prop.minItems,
        maxItems: prop.maxItems,
        required: isRequired,
      });
    } else if (prop?.type === 'number') {
      result.push({
        name,
        type: 'number',
        description,
        default: typeof defaultVal === 'number' ? defaultVal : undefined,
        required: isRequired,
      });
    } else if (prop?.type === 'boolean') {
      result.push({
        name,
        type: 'boolean',
        description,
        default: typeof defaultVal === 'boolean' ? defaultVal : undefined,
        required: isRequired,
      });
    } else {
      result.push({
        name,
        type: 'string',
        description,
        default: typeof defaultVal === 'string' ? defaultVal : undefined,
        required: isRequired,
      });
    }
  }
  return result;
}

export const loadWorkflowsThunk = createAsyncThunk<
  LoadWorkflowsResponse,
  LoadWorkflowsParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>('detail/loadWorkflowsThunk', async (_, { dispatch, rejectWithValue, extra: { services } }) => {
  const { http, notifications } = services;
  try {
    const response = await http.post<WorkflowListDto>('/api/workflows/search', {
      body: JSON.stringify({
        size: MAX_WORKFLOWS_LOOKUP_SIZE,
        page: 1,
      }),
    });

    const workflowsMap: WorkflowsResponse['workflows'] = {};
    response.results.forEach((workflow) => {
      const inputs = workflow.definition?.inputs;
      let legacyInputs: WorkflowsResponse['workflows'][string]['inputs'] | undefined;
      if (Array.isArray(inputs)) {
        legacyInputs = inputs as WorkflowsResponse['workflows'][string]['inputs'];
      } else if (
        inputs &&
        typeof inputs === 'object' &&
        !Array.isArray(inputs) &&
        'properties' in inputs &&
        typeof (inputs as { properties?: unknown }).properties === 'object'
      ) {
        legacyInputs = jsonSchemaInputsToLegacy(
          inputs as { properties?: Record<string, JsonSchemaProperty>; required?: string[] }
        );
      }

      workflowsMap[workflow.id] = {
        id: workflow.id,
        name: workflow.name,
        inputs: legacyInputs,
      };
    });

    const workflowsResponse: WorkflowsResponse = {
      workflows: workflowsMap,
      totalWorkflows: response.total || 0,
    };

    dispatch(setWorkflows(workflowsResponse));

    return workflowsResponse;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    notifications.toasts.addError(new Error(errorMessage), {
      title: 'Failed to load workflows',
    });
    dispatch(setWorkflows(initialWorkflowsState));
    return rejectWithValue(errorMessage);
  }
});
