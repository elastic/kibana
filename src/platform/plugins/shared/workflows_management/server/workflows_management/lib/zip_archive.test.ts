/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import YAML from 'yaml';
import {
  generateWorkflowsArchive,
  parseWorkflowsArchive,
  WorkflowArchiveError,
} from './zip_archive';
import type { WorkflowExportEntry } from '../../../common/lib/export';

async function buildZip(files: Array<{ name: string; content: string }>): Promise<Buffer> {
  const zip = new AdmZip();
  for (const file of files) {
    zip.addFile(file.name, Buffer.from(file.content, 'utf-8'));
  }
  return zip.toBufferPromise();
}

async function buildValidZip(workflows: WorkflowExportEntry[]): Promise<Buffer> {
  const files = workflows.map((w) => ({
    name: `${w.id}.yml`,
    content: w.yaml,
  }));
  const manifest = YAML.stringify({
    exportedCount: workflows.length,
    exportedAt: '2026-01-01T00:00:00.000Z',
    version: '1',
  });
  files.push({ name: 'manifest.yml', content: manifest });
  return buildZip(files);
}

async function buildAdmZip(fn: (zip: AdmZip) => void): Promise<Buffer> {
  const zip = new AdmZip();
  fn(zip);
  return zip.toBufferPromise();
}

describe('generateWorkflowsArchive', () => {
  it('should create a flat ZIP with workflow YAML files and a manifest', async () => {
    const workflows: WorkflowExportEntry[] = [
      { id: 'w-1', yaml: 'name: Workflow One\nsteps: []' },
      { id: 'w-2', yaml: 'name: Workflow Two\nsteps: []' },
    ];

    const buffer = await generateWorkflowsArchive(workflows);
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().map((e) => e.entryName);

    expect(entries).toContain('w-1.yml');
    expect(entries).toContain('w-2.yml');
    expect(entries).toContain('manifest.yml');

    const w1 = zip.getEntry('w-1.yml')!.getData().toString('utf-8');
    expect(w1).toBe('name: Workflow One\nsteps: []');

    const manifestRaw = zip.getEntry('manifest.yml')!.getData().toString('utf-8');
    const manifest = YAML.parse(manifestRaw);
    expect(manifest.exportedCount).toBe(2);
    expect(manifest.version).toBe('1');
    expect(manifest.exportedAt).toBeDefined();
  });
});

describe('parseWorkflowsArchive', () => {
  it('should round-trip through generate and parse', async () => {
    const workflows: WorkflowExportEntry[] = [
      { id: 'w-1', yaml: 'name: One' },
      { id: 'w-2', yaml: 'name: Two' },
    ];
    const buffer = await generateWorkflowsArchive(workflows);
    const parsed = parseWorkflowsArchive(buffer);

    expect(parsed.workflows).toHaveLength(2);
    expect(parsed.workflows[0].id).toBe('w-1');
    expect(parsed.workflows[1].id).toBe('w-2');
    expect(parsed.manifest.exportedCount).toBe(2);
    expect(parsed.errors).toHaveLength(0);
  });

  it('should parse a manually-constructed valid ZIP', async () => {
    const buffer = await buildValidZip([
      { id: 'alpha', yaml: 'name: Alpha' },
      { id: 'beta', yaml: 'name: Beta' },
    ]);
    const parsed = parseWorkflowsArchive(buffer);

    expect(parsed.workflows).toHaveLength(2);
    expect(parsed.manifest.exportedCount).toBe(2);
  });

  it('should respect maxWorkflows option', async () => {
    const buffer = await buildValidZip([
      { id: 'w-1', yaml: 'name: One' },
      { id: 'w-2', yaml: 'name: Two' },
      { id: 'w-3', yaml: 'name: Three' },
    ]);
    const parsed = parseWorkflowsArchive(buffer, { maxWorkflows: 2 });

    expect(parsed.workflows).toHaveLength(2);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]).toContain('Maximum workflow limit');
  });

  it('should throw on invalid ZIP data', () => {
    expect(() => parseWorkflowsArchive(Buffer.from('not a zip', 'utf-8'))).toThrow(
      WorkflowArchiveError
    );
  });

  it('should throw on empty ZIP', async () => {
    const emptyZip = await buildAdmZip(() => {});
    expect(() => parseWorkflowsArchive(emptyZip)).toThrow(WorkflowArchiveError);
  });

  it('should throw when manifest is missing', async () => {
    const buffer = await buildAdmZip((zip) => {
      zip.addFile('w-1.yml', Buffer.from('name: One'));
    });
    expect(() => parseWorkflowsArchive(buffer)).toThrow('manifest.yml');
  });

  it('should throw when manifest is malformed', async () => {
    const buffer = await buildZip([
      { name: 'w-1.yml', content: 'name: One' },
      { name: 'manifest.yml', content: 'this is not valid manifest content' },
    ]);
    expect(() => parseWorkflowsArchive(buffer)).toThrow(WorkflowArchiveError);
  });

  it('should reject nested entries (files inside subdirectories) with errors', async () => {
    const buffer = await buildAdmZip((zip) => {
      zip.addFile('w-1.yml', Buffer.from('name: One'));
      zip.addFile('subdir/w-2.yml', Buffer.from('name: Two'));
      zip.addFile(
        'manifest.yml',
        Buffer.from(
          YAML.stringify({ exportedCount: 1, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
        )
      );
    });
    const parsed = parseWorkflowsArchive(buffer);

    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].id).toBe('w-1');
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]).toContain('Unexpected nested entry');
  });

  it('should reject non-.yml files with errors', async () => {
    const buffer = await buildZip([
      { name: 'w-1.yml', content: 'name: One' },
      { name: 'readme.txt', content: 'not a workflow' },
      {
        name: 'manifest.yml',
        content: YAML.stringify({
          exportedCount: 1,
          exportedAt: '2026-01-01T00:00:00Z',
          version: '1',
        }),
      },
    ]);
    const parsed = parseWorkflowsArchive(buffer);

    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]).toContain('not a .yml or .yaml file');
  });

  it('should reject entries with YAML content exceeding MAX_WORKFLOW_YAML_LENGTH', async () => {
    const oversized = 'a'.repeat(1_024_001);
    const buffer = await buildValidZip([{ id: 'big', yaml: oversized }]);
    const parsed = parseWorkflowsArchive(buffer);

    expect(parsed.workflows).toHaveLength(0);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]).toContain('maximum YAML length');
  });

  it('should reject path traversal entries as nested (adm-zip normalizes ../ to relative)', async () => {
    // adm-zip normalizes "../../../etc/passwd" to "etc/passwd" internally,
    // so it gets caught by the flat-structure check (contains "/").
    const buffer = await buildAdmZip((zip) => {
      zip.addFile('../../../etc/passwd', Buffer.from('evil'));
      zip.addFile(
        'manifest.yml',
        Buffer.from(
          YAML.stringify({ exportedCount: 0, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
        )
      );
    });
    const parsed = parseWorkflowsArchive(buffer);
    expect(parsed.errors.some((e) => e.includes('Unexpected nested entry'))).toBe(true);
  });

  it('should extract workflow ID from filename (stripping .yml extension)', async () => {
    const buffer = await buildValidZip([{ id: 'my-workflow-123', yaml: 'name: Test' }]);
    const parsed = parseWorkflowsArchive(buffer);
    expect(parsed.workflows[0].id).toBe('my-workflow-123');
  });

  it('should reject entries with invalid workflow IDs (e.g. __proto__)', async () => {
    const buffer = await buildAdmZip((zip) => {
      zip.addFile('__proto__.yml', Buffer.from('name: hack'));
      zip.addFile(
        'manifest.yml',
        Buffer.from(
          YAML.stringify({ exportedCount: 0, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
        )
      );
    });
    const parsed = parseWorkflowsArchive(buffer);
    expect(parsed.workflows).toHaveLength(0);
    expect(parsed.errors.some((e) => e.includes('invalid workflow ID'))).toBe(true);
  });

  it('should throw when aggregate decompressed size exceeds the limit', async () => {
    const zip = new AdmZip();
    const largeContent = 'a'.repeat(1_024_000);
    for (let i = 0; i < 55; i++) {
      zip.addFile(`w-${i}.yml`, Buffer.from(largeContent, 'utf-8'));
    }
    zip.addFile(
      'manifest.yml',
      Buffer.from(
        YAML.stringify({ exportedCount: 55, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
      )
    );
    const buffer = await zip.toBufferPromise();
    expect(() => parseWorkflowsArchive(buffer)).toThrow('total decompressed size limit');
  });

  it('should handle .yaml extension in addition to .yml', async () => {
    const buffer = await buildAdmZip((zip) => {
      zip.addFile('w-1.yaml', Buffer.from('name: One'));
      zip.addFile(
        'manifest.yml',
        Buffer.from(
          YAML.stringify({ exportedCount: 1, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
        )
      );
    });
    const parsed = parseWorkflowsArchive(buffer);
    expect(parsed.workflows).toHaveLength(1);
    expect(parsed.workflows[0].id).toBe('w-1');
  });
});
