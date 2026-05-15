/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  transformStorageDocumentToWorkflowDto,
  transformStoragePartialToWorkflowDto,
} from './workflow_dto_transform';
import type { WorkflowProperties } from '../../storage/workflow_storage';

const makeSource = (overrides?: Partial<WorkflowProperties>): WorkflowProperties => ({
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  tags: ['tag-a', 'tag-b'],
  triggerTypes: ['scheduled'],
  yaml: 'name: Test Workflow',
  definition: { triggers: [{ type: 'scheduled', schedule: { interval: '5m' } }] } as any,
  createdBy: 'user-1',
  lastUpdatedBy: 'user-2',
  spaceId: 'default',
  valid: true,
  deleted_at: null,
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-02-20T14:30:00.000Z',
  ...overrides,
});

describe('transformStorageDocumentToWorkflowDto', () => {
  it('maps all WorkflowProperties fields to WorkflowDetailDto correctly', () => {
    const source = makeSource();
    const result = transformStorageDocumentToWorkflowDto('wf-123', source);

    expect(result).toEqual({
      id: 'wf-123',
      name: 'Test Workflow',
      description: 'A test workflow',
      enabled: true,
      yaml: 'name: Test Workflow',
      definition: source.definition,
      createdBy: 'user-1',
      lastUpdatedBy: 'user-2',
      valid: true,
      createdAt: '2024-01-15T10:00:00.000Z',
      lastUpdatedAt: '2024-02-20T14:30:00.000Z',
    });
  });

  it('maps created_at to createdAt and updated_at to lastUpdatedAt', () => {
    const source = makeSource({
      created_at: '2025-03-01T00:00:00.000Z',
      updated_at: '2025-04-01T00:00:00.000Z',
    });
    const result = transformStorageDocumentToWorkflowDto('wf-1', source);

    expect(result.createdAt).toBe('2025-03-01T00:00:00.000Z');
    expect(result.lastUpdatedAt).toBe('2025-04-01T00:00:00.000Z');
  });

  it('throws when id is undefined', () => {
    expect(() => transformStorageDocumentToWorkflowDto(undefined, makeSource())).toThrow(
      'Invalid document, id or source is undefined'
    );
  });

  it('throws when source is undefined', () => {
    expect(() => transformStorageDocumentToWorkflowDto('wf-1', undefined)).toThrow(
      'Invalid document, id or source is undefined'
    );
  });

  it('throws when both id and source are undefined', () => {
    expect(() => transformStorageDocumentToWorkflowDto(undefined, undefined)).toThrow(
      'Invalid document, id or source is undefined'
    );
  });

  it('handles null definition', () => {
    const source = makeSource({ definition: null });
    const result = transformStorageDocumentToWorkflowDto('wf-1', source);

    expect(result.definition).toBeNull();
  });

  it('handles undefined description', () => {
    const source = makeSource({ description: undefined });
    const result = transformStorageDocumentToWorkflowDto('wf-1', source);

    expect(result.description).toBeUndefined();
  });
});

describe('transformStoragePartialToWorkflowDto', () => {
  it('only copies fields that are present on the partial source', () => {
    const result = transformStoragePartialToWorkflowDto('wf-1', {
      name: 'Just name',
      enabled: true,
    });

    expect(result).toEqual({ id: 'wf-1', name: 'Just name', enabled: true });
    // Fields the caller did not ask for must not appear as fabricated `undefined`s.
    expect('yaml' in result).toBe(false);
    expect('definition' in result).toBe(false);
    expect('createdAt' in result).toBe(false);
    expect('lastUpdatedAt' in result).toBe(false);
    expect('valid' in result).toBe(false);
  });

  it('maps created_at/updated_at to their DTO names when present', () => {
    const result = transformStoragePartialToWorkflowDto('wf-1', {
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-02-01T00:00:00.000Z',
    });

    expect(result).toEqual({
      id: 'wf-1',
      createdAt: '2025-01-01T00:00:00.000Z',
      lastUpdatedAt: '2025-02-01T00:00:00.000Z',
    });
  });

  it('preserves explicit null values (e.g. cleared definition)', () => {
    const result = transformStoragePartialToWorkflowDto('wf-1', { definition: null });
    expect(result).toEqual({ id: 'wf-1', definition: null });
  });

  it('returns just { id } when the source is undefined', () => {
    const result = transformStoragePartialToWorkflowDto('wf-1', undefined);
    expect(result).toEqual({ id: 'wf-1' });
  });

  it('throws when id is undefined', () => {
    expect(() => transformStoragePartialToWorkflowDto(undefined, {})).toThrow(
      'Invalid document, id is undefined'
    );
  });
});
