/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { WorkflowsServices } from '../../../../../types';
import type { RootState } from '../../types';
import { setExecutionIdentities } from '../slice';

interface ExecutionIdentityResponse {
  id: string;
  name: string;
  description: string;
}

export const loadExecutionIdentitiesThunk = createAsyncThunk<
  ExecutionIdentityResponse[],
  void,
  { state: RootState; extra: { services: WorkflowsServices } }
>('detail/loadExecutionIdentitiesThunk', async (_, { dispatch, extra: { services } }) => {
  const { http } = services;
  try {
    const response = await http.get<ExecutionIdentityResponse[]>('/internal/execution_identity');
    dispatch(setExecutionIdentities(response));
    return response;
  } catch (error) {
    dispatch(setExecutionIdentities([]));
    return [];
  }
});
