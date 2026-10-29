/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { useSaveYamlWithConfirmation } from './use_save_yaml_with_confirmation';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockSaveYaml = jest.fn();
jest.mock('../../../entities/workflows/model/use_save_yaml', () => ({
  useSaveYaml: () => mockSaveYaml,
}));

const buildYaml = (enabled: boolean) =>
  `name: Test Workflow\nenabled: ${enabled}\ntriggers:\n  - type: manual\nsteps:\n  - name: log\n    type: console\n    with:\n      message: hello`;

describe('useSaveYamlWithConfirmation', () => {
  const confirmDisable = jest.fn();

  const renderSave = (yamlEnabled: boolean) => {
    const store = createMockStore();
    store.dispatch(
      setWorkflow({
        id: 'wf-1',
        name: 'Test Workflow',
        enabled: true,
        yaml: buildYaml(true),
        lastUpdatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        definition: null,
        valid: true,
      })
    );
    store.dispatch(setYamlString(buildYaml(yamlEnabled)));
    const { result } = renderHook(() => useSaveYamlWithConfirmation(confirmDisable), {
      wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
    });
    return result.current;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveYaml.mockResolvedValue(undefined);
  });

  it('saves without confirmation when the workflow stays enabled', async () => {
    await expect(renderSave(true)()).resolves.toBe(true);

    expect(confirmDisable).not.toHaveBeenCalled();
    expect(mockSaveYaml).toHaveBeenCalled();
  });

  it('saves after the user confirms disabling the workflow', async () => {
    confirmDisable.mockResolvedValue(true);

    await expect(renderSave(false)()).resolves.toBe(true);

    expect(confirmDisable).toHaveBeenCalledWith(['wf-1']);
    expect(mockSaveYaml).toHaveBeenCalled();
  });

  it('does not save when the user cancels disabling the workflow', async () => {
    confirmDisable.mockResolvedValue(false);

    await expect(renderSave(false)()).resolves.toBe(false);

    expect(mockSaveYaml).not.toHaveBeenCalled();
  });
});
