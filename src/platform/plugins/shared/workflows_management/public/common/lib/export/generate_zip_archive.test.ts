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
import { generateWorkflowsZip } from './generate_zip_archive';
import type { WorkflowExportEntry } from '../../../../common/lib/import';

const readZipEntry = async (zip: JSZip, name: string): Promise<string> => {
  const file = zip.file(name);
  if (!file) throw new Error(`Entry ${name} not found`);
  return file.async('string');
};

describe('generateWorkflowsZip', () => {
  const baseManifest = {
    exportedCount: 2,
    exportedAt: '2026-01-01T00:00:00.000Z',
    version: '1',
  };

  it('should produce a ZIP with workflow files and a manifest', async () => {
    const entries: WorkflowExportEntry[] = [
      { id: 'w-1', yaml: 'name: Workflow One\nsteps: []' },
      { id: 'w-2', yaml: 'name: Workflow Two\nsteps: []' },
    ];

    const blob = await generateWorkflowsZip(entries, baseManifest);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);

    expect(names).toContain('w-1.yml');
    expect(names).toContain('w-2.yml');
    expect(names).toContain('manifest.yml');

    expect(await readZipEntry(zip, 'w-1.yml')).toBe('name: Workflow One\nsteps: []');
    expect(await readZipEntry(zip, 'w-2.yml')).toBe('name: Workflow Two\nsteps: []');

    const manifest = YAML.parse(await readZipEntry(zip, 'manifest.yml'));
    expect(manifest.exportedCount).toBe(2);
    expect(manifest.version).toBe('1');
    expect(manifest.exportedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should handle empty entries (manifest only)', async () => {
    const manifest = {
      exportedCount: 0,
      exportedAt: '2026-01-01T00:00:00.000Z',
      version: '1',
    };

    const blob = await generateWorkflowsZip([], manifest);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);

    expect(names).toEqual(['manifest.yml']);
    const parsed = YAML.parse(await readZipEntry(zip, 'manifest.yml'));
    expect(parsed.exportedCount).toBe(0);
  });

  it('should preserve UTF-8 content including CJK characters and emoji', async () => {
    const entries: WorkflowExportEntry[] = [
      {
        id: 'w-unicode',
        yaml: 'name: \u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\ndescription: \u2728 sparkle workflow',
      },
    ];
    const manifest = {
      exportedCount: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      version: '1',
    };

    const blob = await generateWorkflowsZip(entries, manifest);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const content = await readZipEntry(zip, 'w-unicode.yml');

    expect(content).toContain('\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC');
    expect(content).toContain('\u2728');
  });

  it('should produce a ZIP compatible with the import parser', async () => {
    const entries: WorkflowExportEntry[] = [
      { id: 'w-round-trip', yaml: 'name: Round Trip\nsteps:\n  - type: http.request' },
    ];
    const manifest = {
      exportedCount: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      version: '1',
    };

    const blob = await generateWorkflowsZip(entries, manifest);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    // Verify flat structure (no directories, no nested paths)
    const allEntries = Object.entries(zip.files);
    for (const [name, entry] of allEntries) {
      expect(entry.dir).toBe(false);
      expect(name.includes('/')).toBe(false);
    }

    // Verify manifest can be parsed by the import schema
    const manifestRaw = await readZipEntry(zip, 'manifest.yml');
    const parsed = YAML.parse(manifestRaw);
    expect(parsed).toEqual({
      exportedCount: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      version: '1',
    });

    // Verify workflow file naming convention matches import expectations
    const workflowFiles = Object.keys(zip.files).filter((n) => n !== 'manifest.yml');
    expect(workflowFiles).toEqual(['w-round-trip.yml']);
  });
});
