/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowValidationError } from '@kbn/workflows-yaml';
import { resolveUniqueWorkflowIds, validateWorkflowId } from './workflow_id_resolver';
import { generateWorkflowId } from '../../common/lib/import';

describe('generateWorkflowId', () => {
  it('should derive a slug from the workflow name', () => {
    expect(generateWorkflowId('My Workflow')).toBe('my-workflow');
  });

  it('should fall back to workflow-{uuid} when name is undefined', () => {
    expect(generateWorkflowId()).toMatch(/^workflow-[0-9a-f-]+$/);
  });

  it('should fall back to workflow-{uuid} when slug is too short', () => {
    expect(generateWorkflowId('ab')).toMatch(/^workflow-[0-9a-f-]+$/);
  });

  it('should fall back to workflow-{uuid} when name has only special characters', () => {
    expect(generateWorkflowId('!!!')).toMatch(/^workflow-[0-9a-f-]+$/);
  });

  it('should strip diacritics and produce a valid slug', () => {
    expect(generateWorkflowId('Alerte Sécurité')).toBe('alerte-securite');
  });
});

describe('validateWorkflowId', () => {
  it('should not throw for a valid ID', () => {
    expect(() => validateWorkflowId('my-workflow')).not.toThrow();
  });

  it('should throw WorkflowValidationError for uppercase ID', () => {
    expect(() => validateWorkflowId('My-Workflow')).toThrow(WorkflowValidationError);
  });

  it('should throw WorkflowValidationError for ID starting with hyphen', () => {
    expect(() => validateWorkflowId('-alert')).toThrow(WorkflowValidationError);
  });

  it('should throw WorkflowValidationError for ID containing dots', () => {
    expect(() => validateWorkflowId('alert.process')).toThrow(WorkflowValidationError);
  });
});

describe('resolveUniqueWorkflowIds', () => {
  const noExisting: () => Promise<Set<string>> = () => Promise.resolve(new Set());

  it('should return base ID when nothing exists', async () => {
    const result = await resolveUniqueWorkflowIds(['my-workflow'], new Set(), noExisting);
    expect(result).toEqual(['my-workflow']);
  });

  it('should return baseId-1 when baseId is taken', async () => {
    const checkExisting = jest.fn(() => Promise.resolve(new Set(['my-workflow'])));
    const result = await resolveUniqueWorkflowIds(['my-workflow'], new Set(), checkExisting);
    expect(result).toEqual(['my-workflow-1']);
  });

  it('should skip to baseId-3 when first three candidates are taken', async () => {
    const taken = new Set(['foo', 'foo-1', 'foo-2']);
    const result = await resolveUniqueWorkflowIds(['foo'], new Set(), () => Promise.resolve(taken));
    expect(result).toEqual(['foo-3']);
  });

  it('should fall back to workflow-{uuid} when all 101 candidates are taken', async () => {
    const allTaken = new Set(['my-workflow']);
    for (let i = 1; i <= 100; i++) {
      allTaken.add(`my-workflow-${i}`);
    }
    const result = await resolveUniqueWorkflowIds(['my-workflow'], new Set(), () =>
      Promise.resolve(allTaken)
    );
    expect(result[0]).toMatch(/^workflow-[0-9a-f-]+$/);
  });

  it('should respect seenIds and skip candidates already reserved', async () => {
    const seenIds = new Set(['my-workflow']);
    const result = await resolveUniqueWorkflowIds(['my-workflow'], seenIds, noExisting);
    expect(result).toEqual(['my-workflow-1']);
  });

  it('should add each resolved ID to seenIds', async () => {
    const seenIds = new Set<string>();
    await resolveUniqueWorkflowIds(['foo'], seenIds, noExisting);
    expect(seenIds.has('foo')).toBe(true);
  });

  it('should resolve multiple base IDs independently with cross-dedup', async () => {
    const result = await resolveUniqueWorkflowIds(['foo', 'bar'], new Set(), noExisting);
    expect(result).toEqual(['foo', 'bar']);
  });

  it('should assign different IDs when the same base ID appears twice', async () => {
    const result = await resolveUniqueWorkflowIds(['foo', 'foo'], new Set(), noExisting);
    expect(result).toEqual(['foo', 'foo-1']);
  });

  it('should deduplicate between seenIds and database results', async () => {
    const seenIds = new Set(['foo']);
    const dbExisting = new Set(['foo-1']);
    const result = await resolveUniqueWorkflowIds(['foo'], seenIds, () =>
      Promise.resolve(dbExisting)
    );
    expect(result).toEqual(['foo-2']);
  });

  it('should handle overlapping candidate sets across base IDs', async () => {
    // "foo" candidates include "foo-1", which is also the base ID for the
    // second entry. The resolver must not assign "foo-1" to the first entry
    // when the second entry already claims it.
    const result = await resolveUniqueWorkflowIds(['foo', 'foo-1'], new Set(), () =>
      Promise.resolve(new Set(['foo']))
    );
    // "foo" is taken in DB → first entry gets "foo-1", but "foo-1" is the
    // second base → second entry should get "foo-1-1" to avoid collision.
    expect(result[0]).toBe('foo-1');
    expect(result[1]).toBe('foo-1-1');
  });
});
