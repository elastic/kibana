/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowListItemDto } from '@kbn/workflows';
import { findMissingReferencedIds, resolveAllReferences } from './export_workflows';

// Mock downloadFileAs (required by module but not used in these tests)
jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: jest.fn(),
}));

jest.mock('@kbn/workflows-yaml', () => ({
  stringifyWorkflowDefinition: (def: unknown) => `stringified:${JSON.stringify(def)}`,
}));

// Mock extractReferencedWorkflowIds
const mockExtractReferencedWorkflowIds = jest.fn();
jest.mock('./export/extract_workflow_references', () => ({
  extractReferencedWorkflowIds: (...args: unknown[]) => mockExtractReferencedWorkflowIds(...args),
}));

const createWorkflow = (
  id: string,
  name: string,
  definition: Record<string, unknown> | null = { name, steps: [] }
): WorkflowListItemDto =>
  ({
    id,
    name,
    description: 'desc',
    enabled: true,
    definition,
    createdAt: '2026-01-01T00:00:00Z',
    history: [],
    valid: true,
  } as unknown as WorkflowListItemDto);

describe('export_workflows - additional coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractReferencedWorkflowIds.mockReturnValue([]);
  });

  // -------------------------------------------------------------------------
  // findMissingReferencedIds
  // -------------------------------------------------------------------------
  describe('findMissingReferencedIds', () => {
    it('should return empty array when no workflows reference others', () => {
      const workflows = [createWorkflow('w-1', 'A')];
      const result = findMissingReferencedIds(workflows);
      expect(result).toEqual([]);
      expect(mockExtractReferencedWorkflowIds).toHaveBeenCalledWith(workflows[0].definition);
    });

    it('should return IDs that are referenced but not in the export list', () => {
      mockExtractReferencedWorkflowIds.mockReturnValue(['w-2', 'w-3']);

      const workflows = [createWorkflow('w-1', 'A')];
      const result = findMissingReferencedIds(workflows);
      expect(result.sort()).toEqual(['w-2', 'w-3']);
    });

    it('should not include IDs already in the export list', () => {
      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-2'];
        return [];
      });

      const workflows = [createWorkflow('w-1', 'A'), createWorkflow('w-2', 'B')];
      const result = findMissingReferencedIds(workflows);
      expect(result).toEqual([]);
    });

    it('should skip workflows without definitions', () => {
      const workflows = [createWorkflow('w-1', 'No Def', null)];
      const result = findMissingReferencedIds(workflows);

      expect(mockExtractReferencedWorkflowIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should deduplicate IDs referenced by multiple workflows', () => {
      mockExtractReferencedWorkflowIds.mockReturnValue(['w-3']);

      const workflows = [createWorkflow('w-1', 'A'), createWorkflow('w-2', 'B')];
      const result = findMissingReferencedIds(workflows);
      // w-3 appears once even though both workflows reference it
      expect(result).toEqual(['w-3']);
    });

    it('should handle multiple referenced IDs from multiple workflows', () => {
      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-3', 'w-4'];
        if (def.name === 'B') return ['w-4', 'w-5'];
        return [];
      });

      const workflows = [createWorkflow('w-1', 'A'), createWorkflow('w-2', 'B')];
      const result = findMissingReferencedIds(workflows);
      expect(result.sort()).toEqual(['w-3', 'w-4', 'w-5']);
    });
  });

  // -------------------------------------------------------------------------
  // resolveAllReferences
  // -------------------------------------------------------------------------
  describe('resolveAllReferences', () => {
    it('should return only initial workflows when no references exist', () => {
      const w1 = createWorkflow('w-1', 'A');
      const allMap = new Map([['w-1', w1]]);

      const result = resolveAllReferences([w1], allMap);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('w-1');
    });

    it('should add directly referenced workflows', () => {
      const w1 = createWorkflow('w-1', 'A');
      const w2 = createWorkflow('w-2', 'B');

      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-2'];
        return [];
      });

      const allMap = new Map([
        ['w-1', w1],
        ['w-2', w2],
      ]);

      const result = resolveAllReferences([w1], allMap);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(['w-1', 'w-2']);
    });

    it('should resolve transitive (chain) references', () => {
      const w1 = createWorkflow('w-1', 'A');
      const w2 = createWorkflow('w-2', 'B');
      const w3 = createWorkflow('w-3', 'C');

      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-2'];
        if (def.name === 'B') return ['w-3'];
        return [];
      });

      const allMap = new Map([
        ['w-1', w1],
        ['w-2', w2],
        ['w-3', w3],
      ]);

      const result = resolveAllReferences([w1], allMap);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id).sort()).toEqual(['w-1', 'w-2', 'w-3']);
    });

    it('should not add references not found in allWorkflowsMap', () => {
      const w1 = createWorkflow('w-1', 'A');

      mockExtractReferencedWorkflowIds.mockReturnValue(['w-missing']);

      const allMap = new Map([['w-1', w1]]);

      const result = resolveAllReferences([w1], allMap);
      expect(result).toHaveLength(1);
    });

    it('should handle circular references without infinite loops', () => {
      const w1 = createWorkflow('w-1', 'A');
      const w2 = createWorkflow('w-2', 'B');

      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-2'];
        if (def.name === 'B') return ['w-1'];
        return [];
      });

      const allMap = new Map([
        ['w-1', w1],
        ['w-2', w2],
      ]);

      const result = resolveAllReferences([w1], allMap);
      expect(result).toHaveLength(2);
    });

    it('should handle workflows without definitions during resolution', () => {
      const w1 = createWorkflow('w-1', 'A');
      const w2 = createWorkflow('w-2', 'B', null);

      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-2'];
        return [];
      });

      const allMap = new Map([
        ['w-1', w1],
        ['w-2', w2],
      ]);

      const result = resolveAllReferences([w1], allMap);
      // w-2 added from reference but has no definition so no further resolution
      expect(result).toHaveLength(2);
    });

    it('should handle multiple initial workflows', () => {
      const w1 = createWorkflow('w-1', 'A');
      const w2 = createWorkflow('w-2', 'B');
      const w3 = createWorkflow('w-3', 'C');

      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        if (def.name === 'A') return ['w-3'];
        if (def.name === 'B') return ['w-3'];
        return [];
      });

      const allMap = new Map([
        ['w-1', w1],
        ['w-2', w2],
        ['w-3', w3],
      ]);

      const result = resolveAllReferences([w1, w2], allMap);
      expect(result).toHaveLength(3);
    });

    it('should respect max resolve depth for deeply nested references', () => {
      // Create a chain longer than MAX_RESOLVE_DEPTH (10)
      const workflows: WorkflowListItemDto[] = [];
      const allMap = new Map<string, WorkflowListItemDto>();

      for (let i = 0; i < 15; i++) {
        const w = createWorkflow(`w-${i}`, `W${i}`);
        workflows.push(w);
        allMap.set(`w-${i}`, w);
      }

      mockExtractReferencedWorkflowIds.mockImplementation((def: Record<string, unknown>) => {
        const match = (def.name as string).match(/^W(\d+)$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (idx < 14) return [`w-${idx + 1}`];
        }
        return [];
      });

      const result = resolveAllReferences([workflows[0]], allMap);
      // Should resolve up to depth 10, so we get w-0 through w-10 = 11 workflows
      expect(result.length).toBeLessThanOrEqual(12);
      expect(result.length).toBeGreaterThan(1);
    });
  });
});
