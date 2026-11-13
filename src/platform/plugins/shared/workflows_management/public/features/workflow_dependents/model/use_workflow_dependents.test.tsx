/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { useWorkflowDependents } from './use_workflow_dependents';
import type { WorkflowDependentsImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';

const SAVED_YAML = 'name: Alert context\nsteps: []';

const response: WorkflowDependentsImpactResponse = {
  analysis: {
    contractChanges: [],
    dependents: [],
    summary: { direct: 0, breaking: 0, warning: 0, unknown: 0, indirectBreaking: 0 },
  },
  calledWorkflows: [],
};

describe('useWorkflowDependents', () => {
  const setup = (mockPost: (services: ReturnType<typeof createStartServicesMock>) => void) => {
    const services = createStartServicesMock();
    mockPost(services);
    const store = createMockStore();
    store.dispatch(
      setWorkflow({
        id: 'alert-context',
        name: 'Alert context',
        enabled: true,
        yaml: SAVED_YAML,
        lastUpdatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        definition: null,
        valid: true,
      })
    );
    store.dispatch(setYamlString(`${SAVED_YAML}\ndescription: first`));
    const wrapper = ({ children }: PropsWithChildren) => (
      <TestProvider services={services} store={store}>
        {children}
      </TestProvider>
    );
    return { services, store, ...renderHook(() => useWorkflowDependents(), { wrapper }) };
  };

  it('marks the results as updating while a newer draft is checked, and as failed if that fails', async () => {
    let rejectRefresh: (error: Error) => void = () => {};
    const { services, store, result } = setup(({ http }) => {
      http.post.mockResolvedValueOnce(response).mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectRefresh = reject;
          })
      );
    });

    await waitFor(() => expect(result.current.analysis).toBeDefined());
    expect(result.current).toMatchObject({ isUpdating: false, isRefreshError: false });

    act(() => {
      store.dispatch(setYamlString(`${SAVED_YAML}\ndescription: second`));
    });
    expect(result.current).toMatchObject({ isUpdating: true, analysis: response.analysis });

    await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(2));
    act(() => rejectRefresh(new Error('Bad YAML')));

    await waitFor(() => expect(result.current.isRefreshError).toBe(true));
    expect(result.current).toMatchObject({
      isUpdating: false,
      isError: false,
      analysis: response.analysis,
    });
  });
});
