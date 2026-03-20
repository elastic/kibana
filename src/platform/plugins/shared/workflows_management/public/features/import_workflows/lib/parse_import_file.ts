/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import JSZip from 'jszip';
import { v4 as generateUuid } from 'uuid';
import YAML from 'yaml';
import {
  detectFileFormat,
  extractWorkflowPreview,
  isValidWorkflowId,
  MAX_AGGREGATE_IMPORT_BYTES,
  MAX_IMPORT_WORKFLOWS,
  MAX_WORKFLOW_YAML_LENGTH,
  WorkflowExportManifestSchema,
} from '../../../../common/lib/export';
import type { WorkflowPreview } from '../../../../common/lib/export';

export interface ClientPreflightResult {
  format: 'zip' | 'yaml';
  totalWorkflows: number;
  parseErrors: string[];
  workflows: WorkflowPreview[];
  /** Workflow IDs extracted from the file, used for server-side conflict checks */
  workflowIds: string[];
  /** Raw workflow payloads (id + YAML string) ready to send to the bulk create API */
  rawWorkflows: Array<{ id: string; yaml: string }>;
}

async function parseZipFile(buffer: ArrayBuffer): Promise<ClientPreflightResult> {
  const zip = await JSZip.loadAsync(buffer);

  const manifestFile = zip.file('manifest.yml');
  if (!manifestFile) {
    throw new Error('ZIP archive does not contain a manifest.yml');
  }

  const manifestRaw = await manifestFile.async('string');
  const manifestParsed = WorkflowExportManifestSchema.safeParse(
    YAML.parse(manifestRaw, { maxAliasCount: 100 })
  );
  if (!manifestParsed.success) {
    throw new Error('Invalid or missing manifest in ZIP archive');
  }

  const workflows: WorkflowPreview[] = [];
  const workflowIds: string[] = [];
  const rawWorkflows: Array<{ id: string; yaml: string }> = [];
  const parseErrors: string[] = [];
  let totalBytes = 0;

  const entries = Object.entries(zip.files).filter(
    ([name, entry]) => !entry.dir && name !== 'manifest.yml'
  );

  for (const [name, entry] of entries) {
    if (name.includes('/')) {
      parseErrors.push(`Unexpected nested entry [${name}]`);
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!name.endsWith('.yml') && !name.endsWith('.yaml')) {
      parseErrors.push(`Entry [${name}] is not a .yml or .yaml file`);
      // eslint-disable-next-line no-continue
      continue;
    }

    if (workflows.length >= MAX_IMPORT_WORKFLOWS) {
      parseErrors.push(
        `Maximum workflow limit of ${MAX_IMPORT_WORKFLOWS} reached; remaining entries skipped`
      );
      break;
    }

    const ext = name.endsWith('.yaml') ? '.yaml' : '.yml';
    const id = name.slice(0, -ext.length);

    if (!isValidWorkflowId(id)) {
      parseErrors.push(
        `Entry [${name}] has an invalid workflow ID: must match [a-zA-Z0-9._-] and be 1-255 characters`
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    let yaml: string;
    try {
      yaml = await entry.async('string');
    } catch {
      parseErrors.push(`Entry [${name}] could not be read (corrupted or invalid encoding)`);
      // eslint-disable-next-line no-continue
      continue;
    }

    totalBytes += new TextEncoder().encode(yaml).byteLength;

    if (totalBytes > MAX_AGGREGATE_IMPORT_BYTES) {
      throw new Error(
        `Archive exceeds the total decompressed size limit of ${MAX_AGGREGATE_IMPORT_BYTES} bytes`
      );
    }

    if (yaml.length > MAX_WORKFLOW_YAML_LENGTH) {
      parseErrors.push(
        `Entry [${name}] exceeds the maximum YAML length of ${MAX_WORKFLOW_YAML_LENGTH} characters`
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    const preview = extractWorkflowPreview(id, yaml);
    workflows.push(preview);
    workflowIds.push(id);
    rawWorkflows.push({ id, yaml });
  }

  if (manifestParsed.data.exportedCount !== workflows.length) {
    parseErrors.push(
      `Manifest declares ${manifestParsed.data.exportedCount} workflows but ${workflows.length} were parsed`
    );
  }

  return {
    format: 'zip',
    totalWorkflows: workflows.length,
    parseErrors,
    workflows,
    workflowIds,
    rawWorkflows,
  };
}

function parseYamlFile(content: string, filename: string): ClientPreflightResult {
  if (content.length > MAX_WORKFLOW_YAML_LENGTH) {
    throw new Error(
      `File exceeds the maximum YAML length of ${MAX_WORKFLOW_YAML_LENGTH} characters`
    );
  }

  const id = `workflow-${generateUuid()}`;

  const preview = extractWorkflowPreview(id, content);

  return {
    format: 'yaml',
    totalWorkflows: 1,
    parseErrors: [],
    workflows: [preview],
    workflowIds: [id],
    rawWorkflows: [{ id, yaml: content }],
  };
}

/**
 * Parses an import file (YAML or ZIP) entirely on the client side and extracts
 * workflow previews. Does NOT check for server-side conflicts — that's a
 * separate step using the extracted `workflowIds`.
 */
export async function parseImportFile(file: File): Promise<ClientPreflightResult> {
  const buffer = await file.arrayBuffer();

  if (buffer.byteLength === 0) {
    throw new Error('The uploaded file is empty');
  }

  const format = detectFileFormat(new Uint8Array(buffer));

  if (format === 'zip') {
    return parseZipFile(buffer);
  }

  const content = new TextDecoder('utf-8').decode(buffer);
  if (!content.trim()) {
    throw new Error('The uploaded file is empty');
  }

  return parseYamlFile(content, file.name);
}
