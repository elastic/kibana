/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import JSZip from 'jszip';
import YAML from 'yaml';
import { parseImportFile } from './parse_import_file';
import { MAX_AGGREGATE_IMPORT_BYTES } from '../../../../common/lib/import';

jest.mock('../../../../common/lib/yaml/parse_workflow_yaml_to_json_without_validation', () => ({
  parseYamlToJSONWithoutValidation: (yamlString: string) => {
    try {
      const json = jest.requireActual('yaml').parse(yamlString) as Record<string, unknown>;
      return { success: true, json, document: {} };
    } catch {
      return { success: false, error: new Error('parse failed'), document: {} };
    }
  },
}));

function createFile(content: string | ArrayBuffer, name: string, type = ''): File {
  const blob = content instanceof ArrayBuffer ? new Blob([content]) : new Blob([content]);
  return new File([blob], name, { type });
}

async function createZipFile(
  workflows: Array<{ id: string; yaml: string }>,
  includeManifest = true
): Promise<File> {
  const zip = new JSZip();
  for (const w of workflows) {
    zip.file(`${w.id}.yml`, w.yaml);
  }
  if (includeManifest) {
    const manifest = YAML.stringify({
      exportedCount: workflows.length,
      exportedAt: '2026-01-01T00:00:00.000Z',
      version: '1',
    });
    zip.file('manifest.yml', manifest);
  }
  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  return createFile(buffer, 'workflows.zip', 'application/zip');
}

describe('parseImportFile', () => {
  describe('YAML files', () => {
    it('should parse a single YAML file and extract preview', async () => {
      const yaml = 'name: Test Workflow\nsteps:\n  - name: s1\n    type: console';
      const file = createFile(yaml, 'my-workflow.yml');
      const result = await parseImportFile(file);

      expect(result.format).toBe('yaml');
      expect(result.totalWorkflows).toBe(1);
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].id).toBe('test-workflow');
      expect(result.workflows[0].name).toBe('Test Workflow');
      expect(result.workflowIds).toHaveLength(1);
      expect(result.workflowIds[0]).toBe('test-workflow');
      expect(result.rawWorkflows).toHaveLength(1);
      expect(result.rawWorkflows[0].id).toBe('test-workflow');
      // For YAML imports there is no ZIP filename, so originalId equals id.
      expect(result.rawWorkflows[0].originalId).toBe('test-workflow');
      expect(result.rawWorkflows[0].yaml).toBe(yaml);
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should throw for empty files', async () => {
      const file = createFile('', 'empty.yml');
      await expect(parseImportFile(file)).rejects.toThrow('empty');
    });

    it('should throw for whitespace-only files', async () => {
      const file = createFile('   \n  ', 'blank.yml');
      await expect(parseImportFile(file)).rejects.toThrow('empty');
    });

    it('should fall back to workflow-{uuid} ID when name field is absent', async () => {
      const yaml = 'steps:\n  - type: console';
      const file = createFile(yaml, 'no-name.yml');
      const result = await parseImportFile(file);

      const uuidPattern = /^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(result.workflows[0].id).toMatch(uuidPattern);
      expect(result.workflowIds[0]).toMatch(uuidPattern);
      expect(result.rawWorkflows[0].id).toBe(result.workflows[0].id);
      expect(result.workflows[0].name).toBeNull();
    });

    it('should use stringified numeric name as ID when it meets the 3-char minimum', async () => {
      // toSlugIdentifier('123') → '123' (3 chars), which satisfies the minimum — no UUID fallback.
      const yaml = 'name: 123\nsteps: []';
      const file = createFile(yaml, 'numeric-name.yml');
      const result = await parseImportFile(file);

      expect(result.workflows[0].id).toBe('123');
      // name is null because the YAML value is a number, not a string;
      // only string-typed name fields are surfaced as the display name.
      expect(result.workflows[0].name).toBeNull();
      expect(result.workflows[0].valid).toBe(true);
    });

    it('should slugify special characters in name', async () => {
      const yaml = 'name: "Hello, World! (2024)"\nsteps: []';
      const file = createFile(yaml, 'special-chars.yml');
      const result = await parseImportFile(file);

      expect(result.workflows[0].id).toBe('hello-world-2024');
      expect(result.workflowIds[0]).toBe('hello-world-2024');
      expect(result.rawWorkflows[0].id).toBe('hello-world-2024');
    });

    it('should strip diacritics from name when generating ID', async () => {
      const yaml = 'name: "Café Résumé"\nsteps: []';
      const file = createFile(yaml, 'diacritics.yml');
      const result = await parseImportFile(file);

      expect(result.workflows[0].id).toBe('cafe-resume');
    });

    it('should convert underscores in name to hyphens in ID', async () => {
      const yaml = 'name: "my_workflow"\nsteps: []';
      const file = createFile(yaml, 'underscores.yml');
      const result = await parseImportFile(file);

      expect(result.workflows[0].id).toBe('my-workflow');
    });

    it('should trim leading and trailing whitespace from name when generating ID', async () => {
      const yaml = 'name: "  My Workflow  "\nsteps: []';
      const file = createFile(yaml, 'whitespace-name.yml');
      const result = await parseImportFile(file);

      expect(result.workflows[0].id).toBe('my-workflow');
    });

    it('should fall back to workflow-{uuid} and valid: false when YAML parses to a scalar', async () => {
      const yaml = 'just a string';
      const file = createFile(yaml, 'scalar.yml');
      const result = await parseImportFile(file);

      expect(result.workflows[0].id).toMatch(/^workflow-[0-9a-f-]{36}$/);
      expect(result.workflows[0].valid).toBe(false);
      expect(result.workflows[0].name).toBeNull();
      expect(result.parseErrors).toHaveLength(0);
      expect(result.workflowIds[0]).toBe(result.workflows[0].id);
    });
  });

  describe('ZIP files', () => {
    it('should parse a valid ZIP with workflow previews', async () => {
      const file = await createZipFile([
        { id: 'w-1', yaml: 'name: One\nsteps: []' },
        { id: 'w-2', yaml: 'name: Two\nsteps: []' },
      ]);
      const result = await parseImportFile(file);

      expect(result.format).toBe('zip');
      expect(result.totalWorkflows).toBe(2);
      expect(result.workflows).toHaveLength(2);
      expect(result.workflowIds).toEqual(['one', 'two']);
      // originalId is the ZIP entry filename stem (the persisted export ID);
      // id is the slug-of-name used as the import ID.
      expect(result.rawWorkflows).toEqual([
        { id: 'one', originalId: 'w-1', yaml: 'name: One\nsteps: []' },
        { id: 'two', originalId: 'w-2', yaml: 'name: Two\nsteps: []' },
      ]);
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should throw when manifest is missing', async () => {
      const file = await createZipFile([{ id: 'one', yaml: 'name: Test' }], false);
      await expect(parseImportFile(file)).rejects.toThrow('manifest');
    });

    it('should reject entries with invalid IDs', async () => {
      const zip = new JSZip();
      zip.file('__proto__.yml', 'name: hack');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 0,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'bad.zip');
      const result = await parseImportFile(file);

      expect(result.workflows).toHaveLength(0);
      expect(result.parseErrors.some((e) => e.includes('invalid workflow ID'))).toBe(true);
    });

    it('should reject non-yml entries with errors', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: One');
      zip.file('readme.txt', 'not a workflow');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'mixed.zip');
      const result = await parseImportFile(file);

      expect(result.workflows).toHaveLength(1);
      expect(result.parseErrors).toHaveLength(1);
      expect(result.parseErrors[0]).toContain('not a .yml');
    });

    it('should report parse error for nested directory entries', async () => {
      const zip = new JSZip();
      zip.file('subdir/nested.yml', 'name: Nested');
      zip.file('w-1.yml', 'name: Root');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'nested.zip');
      const result = await parseImportFile(file);

      expect(result.workflows).toHaveLength(1);
      expect(result.parseErrors.some((e) => e.includes('Unexpected nested entry'))).toBe(true);
    });

    it('should report manifest count mismatch as a parse error', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: One');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 5,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'mismatch.zip');
      const result = await parseImportFile(file);

      expect(result.workflows).toHaveLength(1);
      expect(
        result.parseErrors.some(
          (e) => e.includes('Manifest declares 5') && e.includes('1 were parsed')
        )
      ).toBe(true);
    });

    it('should correctly derive ID from name field', async () => {
      const zip = new JSZip();
      zip.file('my-workflow.yaml', 'name: My workflow');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'yaml-ext.zip');
      const result = await parseImportFile(file);

      expect(result.workflowIds).toEqual(['my-workflow']);
      expect(result.workflows[0].id).toBe('my-workflow');
    });

    it('should reject constructor and prototype as unsafe IDs', async () => {
      const zip = new JSZip();
      zip.file('constructor.yml', 'name: Ctor');
      zip.file('prototype.yml', 'name: Proto');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 0,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'unsafe.zip');
      const result = await parseImportFile(file);

      expect(result.workflows).toHaveLength(0);
      expect(result.parseErrors.filter((e) => e.includes('invalid workflow ID'))).toHaveLength(2);
    });

    it('should throw for manifest with unsupported version', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: Test');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '99',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'bad-version.zip');

      await expect(parseImportFile(file)).rejects.toThrow('Invalid or missing manifest');
    });

    it('should handle ZIP with only manifest and no workflow entries', async () => {
      const zip = new JSZip();
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 0,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'empty.zip');
      const result = await parseImportFile(file);

      expect(result.format).toBe('zip');
      expect(result.totalWorkflows).toBe(0);
      expect(result.workflows).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should reject entries exceeding per-entry YAML length limit', async () => {
      const longYaml = `name: ${'x'.repeat(1_048_576)}`;
      const zip = new JSZip();
      zip.file('w-1.yml', longYaml);
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'large-entry.zip');
      const result = await parseImportFile(file);

      expect(result.workflows).toHaveLength(0);
      expect(result.parseErrors.some((e) => e.includes('maximum YAML length'))).toBe(true);
    });

    it('should use the name-derived ID from YAML content, not from the ZIP filename', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: "Hello, World! (2024)"\nsteps: []');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'name-vs-filename.zip');
      const result = await parseImportFile(file);

      expect(result.workflowIds).toEqual(['hello-world-2024']);
      expect(result.rawWorkflows[0].id).toBe('hello-world-2024');
      expect(result.workflows[0].id).toBe('hello-world-2024');
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should fall back to workflow-{uuid} ID when ZIP entry YAML has no name field', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'steps:\n  - type: console');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'no-name.zip');
      const result = await parseImportFile(file);

      const uuidPattern = /^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(result.workflowIds[0]).toMatch(uuidPattern);
      expect(result.rawWorkflows[0].id).toBe(result.workflowIds[0]);
      expect(result.workflows[0].id).toBe(result.workflowIds[0]);
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should fall back to workflow-{uuid} when numeric name slugifies to fewer than 3 characters', async () => {
      // toSlugIdentifier('42') → '42' (2 chars), which is below the 3-char minimum
      // enforced by WorkflowExportEntrySchema. generatePreviewId must fall back to UUID.
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: 42\nsteps: []');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'numeric-name.zip');
      const result = await parseImportFile(file);

      const uuidPattern = /^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(result.workflows[0].id).toMatch(uuidPattern);
      // name is null because the YAML value is a number, not a string;
      // only string-typed name fields are surfaced as the display name.
      expect(result.workflows[0].name).toBeNull();
      expect(result.workflows[0].valid).toBe(true);
    });

    it('should admit a ZIP entry with scalar YAML content and mark it valid: false', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'just a string');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'scalar-content.zip');
      const result = await parseImportFile(file);

      expect(result.totalWorkflows).toBe(1);
      expect(result.workflows[0].valid).toBe(false);
      expect(result.workflows[0].id).toMatch(/^workflow-[0-9a-f-]{36}$/);
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should fall back to workflow-{uuid} when the workflow name slugifies to an empty string', async () => {
      // Names consisting entirely of characters that strip to nothing (e.g. "!!!") produce an
      // empty slug. generatePreviewId must fall back to a UUID in that case.
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: "!!!"\nsteps: []');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'empty-slug.zip');
      const result = await parseImportFile(file);

      const uuidPattern = /^workflow-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(result.workflowIds[0]).toMatch(uuidPattern);
      expect(result.rawWorkflows[0].id).toBe(result.workflowIds[0]);
      expect(result.rawWorkflows[0].originalId).toBe('w-1');
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should preserve originalId from ZIP filename for cross-workflow reference rewriting', async () => {
      // Workflow A (persisted ID: "sender-abc") calls Workflow B (persisted ID: "processor-xyz").
      // On import both get slug-of-name IDs. originalId must carry the persisted export ID so
      // that the reference rewriter can map it correctly.
      const zip = new JSZip();
      zip.file('sender-abc.yml', 'name: Sender\nsteps:\n  - type: workflow.execute\n    with:\n      workflow-id: processor-xyz');
      zip.file('processor-xyz.yml', 'name: Processor\nsteps: []');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 2,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'related.zip');
      const result = await parseImportFile(file);

      // Import IDs are derived from workflow names
      expect(result.workflowIds).toContain('sender');
      expect(result.workflowIds).toContain('processor');

      const senderRaw = result.rawWorkflows.find((w) => w.id === 'sender')!;
      const processorRaw = result.rawWorkflows.find((w) => w.id === 'processor')!;

      // originalId must carry the persisted export ID (the ZIP filename stem)
      expect(senderRaw.originalId).toBe('sender-abc');
      expect(processorRaw.originalId).toBe('processor-xyz');
    });

    it('should assign distinct postfixed IDs when two workflows in the same batch conflict and slug to the same name', async () => {
      // This test validates the intra-batch collision guard in use_workflow_actions.ts
      // indirectly via the parse result: both workflows must be parsed successfully
      // with their individual originalIds intact, ready for the conflict loop.
      const zip = new JSZip();
      zip.file('wf-a.yml', 'name: Duplicate\nsteps: []');
      zip.file('wf-b.yml', 'name: Duplicate\nsteps: []');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 2,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'duplicate-names.zip');
      const result = await parseImportFile(file);

      // Both entries parse to the same slug-of-name; originalIds are distinct
      expect(result.rawWorkflows[0].id).toBe('duplicate');
      expect(result.rawWorkflows[1].id).toBe('duplicate');
      expect(result.rawWorkflows[0].originalId).toBe('wf-a');
      expect(result.rawWorkflows[1].originalId).toBe('wf-b');
    });
  });

  describe('YAML files - limits', () => {
    it('should throw for standalone YAML file exceeding MAX_WORKFLOW_YAML_LENGTH', async () => {
      const longYaml = `name: ${'x'.repeat(1_048_576)}`;
      const file = createFile(longYaml, 'huge.yml');

      await expect(parseImportFile(file)).rejects.toThrow('maximum YAML length');
    });
  });

  describe('ZIP files - limits', () => {
    it('should throw when total decompressed bytes exceed MAX_AGGREGATE_IMPORT_BYTES', async () => {
      const zip = new JSZip();
      zip.file('w-1.yml', 'name: First\nsteps: []');
      zip.file('w-2.yml', 'name: Second\nsteps: []');
      zip.file(
        'manifest.yml',
        YAML.stringify({
          exportedCount: 2,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        })
      );
      const buffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = createFile(buffer, 'oversized.zip');

      // Make every encode() call report MAX_AGGREGATE_IMPORT_BYTES bytes so the
      // aggregate limit is exceeded after the very first workflow entry is read.
      const encodeSpy = jest
        .spyOn(TextEncoder.prototype, 'encode')
        .mockReturnValue(new Uint8Array(MAX_AGGREGATE_IMPORT_BYTES + 1));

      try {
        await expect(parseImportFile(file)).rejects.toThrow('total decompressed size limit');
      } finally {
        encodeSpy.mockRestore();
      }
    });
  });
});
