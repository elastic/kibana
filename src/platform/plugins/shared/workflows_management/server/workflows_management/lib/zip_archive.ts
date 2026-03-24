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
import type { WorkflowExportEntry, WorkflowExportManifest } from '../../../common/lib/import';
import { WORKFLOW_EXPORT_VERSION } from '../../../common/lib/import';

const MANIFEST_FILENAME = 'manifest.yml';

/**
 * Builds a flat ZIP archive containing one `.yml` file per workflow plus a manifest.
 *
 * Structure:
 *   manifest.yml
 *   <id>.yml
 */
export async function generateWorkflowsArchive(workflows: WorkflowExportEntry[]): Promise<Buffer> {
  const zip = new AdmZip();

  for (const workflow of workflows) {
    zip.addFile(`${workflow.id}.yml`, Buffer.from(workflow.yaml, 'utf-8'));
  }

  const manifest: WorkflowExportManifest = {
    exportedCount: workflows.length,
    exportedAt: new Date().toISOString(),
    version: WORKFLOW_EXPORT_VERSION,
  };
  zip.addFile(MANIFEST_FILENAME, Buffer.from(YAML.stringify(manifest), 'utf-8'));

  return zip.toBufferPromise();
}
