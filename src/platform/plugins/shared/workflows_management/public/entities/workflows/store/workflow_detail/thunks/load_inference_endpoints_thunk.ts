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
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { setInferenceEndpoints } from '../slice';

export interface InferenceEndpointsResponse {
  endpoints: Array<{
    id: string;
    name: string;
    service: string;
    task_type: string;
  }>;
  total: number;
}

export type LoadInferenceEndpointsParams = void;
export type LoadInferenceEndpointsResponse = InferenceEndpointsResponse;

export const loadInferenceEndpointsThunk = createAsyncThunk<
  LoadInferenceEndpointsResponse,
  LoadInferenceEndpointsParams,
  { state: RootState; extra: { services: WorkflowsServices } }
>(
  'detail/loadInferenceEndpointsThunk',
  async (_, { dispatch, rejectWithValue, extra: { services } }) => {
    const { http, notifications } = services;
    try {
      const response = await http.get<InferenceEndpointsResponse>(
        '/api/workflows/inference-endpoints'
      );
      dispatch(setInferenceEndpoints(response));
      return response;
    } catch (error) {
      const errorMessage =
        error.body?.message || error.message || 'Failed to load inference endpoints';

      notifications.toasts.addError(errorMessage, {
        title: i18n.translate('workflows.detail.loadInferenceEndpoints.error', {
          defaultMessage: 'Failed to load inference endpoints',
        }),
      });
      return rejectWithValue(errorMessage);
    }
  }
);
