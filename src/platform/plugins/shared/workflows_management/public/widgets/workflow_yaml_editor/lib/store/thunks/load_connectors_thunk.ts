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
import {
  addDynamicConnectorsToCache,
  getWorkflowZodSchemaLoose,
} from '../../../../../../common/schema';
import type { ConnectorsResponse } from '../../../../../entities/connectors/model/types';
import type { WorkflowsServices } from '../../../../../types';
import { _setGeneratedSchemaInternal, setConnectors } from '../slice';
import type { RootState } from '../types';

export type LoadConnectorsParams = void;
export type LoadConnectorsResponse = ConnectorsResponse;

export const loadConnectorsThunk = createAsyncThunk<
  LoadConnectorsResponse,
  LoadConnectorsParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadConnectorsThunk',
  async (_, { getState, dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    const state = getState();
    const lastConnectorTypes = state.detail.connectors?.connectorTypes;
    try {
      // Not caching to avoid missing newly created connectors. We can think of caching if this becomes a bottleneck.
      const response = await http.get<ConnectorsResponse>('/api/workflows/connectors');
      dispatch(setConnectors(response)); // Set connectors response first

      const currentConnectorTypes = response.connectorTypes;
      // Simple check: compare the number of connector types and their keys
      const hasChanged =
        !lastConnectorTypes ||
        Object.keys(currentConnectorTypes).length !== Object.keys(lastConnectorTypes).length ||
        !Object.keys(currentConnectorTypes).every((key) => key in lastConnectorTypes);

      if (hasChanged) {
        addDynamicConnectorsToCache(currentConnectorTypes);

        const schemaLoose = getWorkflowZodSchemaLoose(currentConnectorTypes);
        dispatch(_setGeneratedSchemaInternal(schemaLoose));
      }

      return response;
    } catch (error) {
      // Extract error message from HTTP error body if available
      const errorMessage = error.body?.message || error.message || 'Failed to load connectors';

      notifications.toasts.addError(errorMessage, {
        title: i18n.translate('workflows.detail.loadConnectors.error', {
          defaultMessage: 'Failed to load connectors',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
