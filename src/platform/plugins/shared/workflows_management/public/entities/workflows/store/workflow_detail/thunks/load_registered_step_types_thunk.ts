/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { i18n } from '@kbn/i18n';
import { getWorkflowZodSchema } from '../../../../../../common/schema';
import { setRegisteredStepTypes, _setGeneratedSchemaInternal } from '../slice';
import type { RootState, RegisteredStepTypesResponse } from '../../types';
import type { WorkflowsServices } from '../../../../../types';
import { clearConnectorTypeSuggestionsCache } from '../../../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/connector_type/get_connector_type_suggestions';

export interface LoadRegisteredStepTypesParams {}

export type LoadRegisteredStepTypesResponse = RegisteredStepTypesResponse;

export const loadRegisteredStepTypesThunk = createAsyncThunk<
  LoadRegisteredStepTypesResponse,
  LoadRegisteredStepTypesParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadRegisteredStepTypesThunk',
  async (_, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const state = getState();
    const lastRegisteredStepTypes = state.detail.registeredStepTypes?.stepTypes;
    try {
      const response = await http.get<RegisteredStepTypesResponse>(
        '/api/workflows/registered_step_types'
      );
      dispatch(setRegisteredStepTypes(response));

      const currentRegisteredStepTypes = response.stepTypes;
      // Simple check: compare the number of step types
      const hasChanged =
        !lastRegisteredStepTypes ||
        currentRegisteredStepTypes.length !== lastRegisteredStepTypes.length ||
        !currentRegisteredStepTypes.every((stepType) =>
          lastRegisteredStepTypes.some((last) => last.id === stepType.id)
        );

      if (hasChanged) {
        // Clear autocomplete cache so new step types appear in suggestions
        clearConnectorTypeSuggestionsCache();
        
        // Get connectors from state to pass to schema generation
        const connectorTypes = state.detail.connectors?.connectorTypes ?? {};
        const schema = getWorkflowZodSchema(connectorTypes, currentRegisteredStepTypes);
        dispatch(_setGeneratedSchemaInternal(schema));
      }

      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage =
        error.body?.message || error.message || 'Failed to load registered step types';

      notifications.toasts.addError(errorMessage, {
        title: i18n.translate('workflows.detail.loadRegisteredStepTypes.error', {
          defaultMessage: 'Failed to load registered step types',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);

