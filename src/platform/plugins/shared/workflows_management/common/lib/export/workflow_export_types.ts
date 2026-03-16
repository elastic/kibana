/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import { z } from '@kbn/zod';

export const WORKFLOW_EXPORT_VERSION = '1';
export { MAX_WORKFLOW_YAML_LENGTH };

export const WorkflowExportEntrySchema = z.object({
  id: z.string(),
  yaml: z.string().max(MAX_WORKFLOW_YAML_LENGTH),
});

const SUPPORTED_EXPORT_VERSIONS = [WORKFLOW_EXPORT_VERSION] as const;

export const WorkflowExportManifestSchema = z
  .object({
    exportedCount: z.number(),
    exportedAt: z.string(),
    version: z.enum(SUPPORTED_EXPORT_VERSIONS),
  })
  .strict();

export type WorkflowExportEntry = z.infer<typeof WorkflowExportEntrySchema>;
export type WorkflowExportManifest = z.infer<typeof WorkflowExportManifestSchema>;
