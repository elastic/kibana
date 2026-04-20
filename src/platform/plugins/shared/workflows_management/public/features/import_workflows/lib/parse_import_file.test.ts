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
      expect(result.workflows[0].id).toMatch(/^workflow-[0-9a-f-]+$/);
      expect(result.workflows[0].name).toBe('Test Workflow');
      expect(result.workflowIds).toHaveLength(1);
      expect(result.workflowIds[0]).toMatch(/^workflow-[0-9a-f-]+$/);
      expect(result.rawWorkflows).toHaveLength(1);
      expect(result.rawWorkflows[0].id).toMatch(/^workflow-[0-9a-f-]+$/);
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
      expect(result.workflowIds).toEqual(['w-1', 'w-2']);
      expect(result.rawWorkflows).toEqual([
        { id: 'w-1', yaml: 'name: One\nsteps: []' },
        { id: 'w-2', yaml: 'name: Two\nsteps: []' },
      ]);
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should throw when manifest is missing', async () => {
      const file = await createZipFile([{ id: 'w-1', yaml: 'name: Test' }], false);
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

    it('should correctly derive ID from .yaml extension', async () => {
      const zip = new JSZip();
      zip.file('my-workflow.yaml', 'name: YAML Extension');
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
  });

  describe('YAML files - limits', () => {
    it('should throw for standalone YAML file exceeding MAX_WORKFLOW_YAML_LENGTH', async () => {
      const longYaml = `name: ${'x'.repeat(1_048_576)}`;
      const file = createFile(longYaml, 'huge.yml');

      await expect(parseImportFile(file)).rejects.toThrow('maximum YAML length');
    });
  });
});
