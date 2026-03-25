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
import { generateWorkflowsArchive } from './zip_archive';
import type { WorkflowExportEntry } from '../../../common/lib/import';

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
