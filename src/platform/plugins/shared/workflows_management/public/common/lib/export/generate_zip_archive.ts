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
import type { WorkflowExportEntry } from '../../../../common/lib/import';

interface Manifest {
  exportedCount: number;
  exportedAt: string;
  version: string;
}

/**
 * Builds a flat ZIP archive containing one `.yml` file per workflow plus a manifest.
 * Produces the same structure that the import parser (`parseZipFile`) expects:
 *   manifest.yml
 *   <id>.yml
 */
export const generateWorkflowsZip = async (
  entries: WorkflowExportEntry[],
  manifest: Manifest
): Promise<Blob> => {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(`${entry.id}.yml`, entry.yaml);
  }

  zip.file('manifest.yml', YAML.stringify(manifest));

  return zip.generateAsync({ type: 'blob' });
};
