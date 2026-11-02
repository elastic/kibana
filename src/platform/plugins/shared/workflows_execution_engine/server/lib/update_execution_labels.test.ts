/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  UPDATE_EXECUTION_LABELS_MAX_ATTEMPTS,
  updateExecutionLabels,
  type UpdateExecutionLabelsParams,
} from './update_execution_labels';

const namespaces = new Map([['hunt', 'alertzero']]);

const params: UpdateExecutionLabelsParams = {
  executionId: 'e1',
  spaceId: 'default',
  workflowId: 'wf',
  labelOwnerId: 'alertzero',
  labels: { 'hunt.outcome': 'clean' },
  immutableKeys: ['hunt.kind'],
};

const stored = (labels?: Record<string, string>, workflowId = 'wf') => ({
  execution: { id: 'e1', spaceId: 'default', workflowId, labels } as any,
  seqNo: 3,
  primaryTerm: 1,
});

describe('updateExecutionLabels', () => {
  const getWorkflowExecutionWithVersion = jest.fn();
  const tryUpdateWorkflowExecutionWithVersion = jest.fn();
  const deps = {
    repository: { getWorkflowExecutionWithVersion, tryUpdateWorkflowExecutionWithVersion },
    namespaces,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    tryUpdateWorkflowExecutionWithVersion.mockResolvedValue(true);
  });

  it('merges onto the stored labels with the read revision', async () => {
    getWorkflowExecutionWithVersion.mockResolvedValue(
      stored({ 'hunt.kind': 'manual_session', 'hunt.outcome': 'exploratory' })
    );

    await expect(updateExecutionLabels(deps, params)).resolves.toEqual({
      'hunt.kind': 'manual_session',
      'hunt.outcome': 'clean',
    });
    expect(getWorkflowExecutionWithVersion).toHaveBeenCalledWith('e1', 'default');
    expect(tryUpdateWorkflowExecutionWithVersion).toHaveBeenCalledWith(
      { id: 'e1', labels: { 'hunt.kind': 'manual_session', 'hunt.outcome': 'clean' } },
      { seqNo: 3, primaryTerm: 1 }
    );
  });

  it('retries a revision conflict against a fresh read', async () => {
    getWorkflowExecutionWithVersion
      .mockResolvedValueOnce(stored({ 'hunt.kind': 'manual_session' }))
      .mockResolvedValueOnce(stored({ 'hunt.kind': 'manual_session', 'hunt.reason_code': 'x' }));
    tryUpdateWorkflowExecutionWithVersion.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(updateExecutionLabels(deps, params)).resolves.toEqual({
      'hunt.kind': 'manual_session',
      'hunt.reason_code': 'x',
      'hunt.outcome': 'clean',
    });
    expect(tryUpdateWorkflowExecutionWithVersion).toHaveBeenCalledTimes(2);
  });

  it('fails closed after repeated conflicts', async () => {
    getWorkflowExecutionWithVersion.mockResolvedValue(stored({}));
    tryUpdateWorkflowExecutionWithVersion.mockResolvedValue(false);

    await expect(updateExecutionLabels(deps, params)).rejects.toThrow('changed concurrently');
    expect(tryUpdateWorkflowExecutionWithVersion).toHaveBeenCalledTimes(
      UPDATE_EXECUTION_LABELS_MAX_ATTEMPTS
    );
  });

  it.each([
    ['is missing or in another space', null],
    ['belongs to another workflow', stored({}, 'other-wf')],
  ])('rejects an execution that %s with a uniform not-found error', async (_, found) => {
    getWorkflowExecutionWithVersion.mockResolvedValue(found);

    await expect(updateExecutionLabels(deps, params)).rejects.toThrow('was not found');
    expect(tryUpdateWorkflowExecutionWithVersion).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong owner', { ...params, labelOwnerId: 'other' }, 'owned by "alertzero"'],
    ['unregistered key', { ...params, labels: { 'nope.x': 'v' } }, 'not registered'],
    ['invalid key', { ...params, labels: { Bad: 'v' } }, 'namespaced key'],
  ])('rejects a %s before reading', async (_, bad, message) => {
    await expect(updateExecutionLabels(deps, bad)).rejects.toThrow(message);
    expect(getWorkflowExecutionWithVersion).not.toHaveBeenCalled();
  });

  it('rejects changing an immutable identity label', async () => {
    getWorkflowExecutionWithVersion.mockResolvedValue(stored({ 'hunt.kind': 'manual_session' }));

    await expect(
      updateExecutionLabels(deps, { ...params, labels: { 'hunt.kind': 'library_child' } })
    ).rejects.toThrow('immutable');
    expect(tryUpdateWorkflowExecutionWithVersion).not.toHaveBeenCalled();
  });

  it('rejects a merge that exceeds the key bound', async () => {
    getWorkflowExecutionWithVersion.mockResolvedValue(
      stored(Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`hunt.k${i}`, 'v'])))
    );

    await expect(updateExecutionLabels(deps, params)).rejects.toThrow('after merge');
  });
});
