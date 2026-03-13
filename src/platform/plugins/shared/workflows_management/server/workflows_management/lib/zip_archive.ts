/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import path from 'path';
import YAML from 'yaml';

import { isValidWorkflowId } from './import_utils';
import {
  MAX_WORKFLOW_YAML_LENGTH,
  WORKFLOW_EXPORT_VERSION,
  WorkflowExportManifestSchema,
} from '../../../common/lib/export';
import type { WorkflowExportEntry, WorkflowExportManifest } from '../../../common/lib/export';

const MANIFEST_FILENAME = 'manifest.yml';
const ARCHIVE_ENTRY_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB uncompressed per entry
const ARCHIVE_TOTAL_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB aggregate decompressed limit

export class WorkflowArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowArchiveError';
  }
}

export interface ParsedWorkflowsArchive {
  workflows: WorkflowExportEntry[];
  manifest: WorkflowExportManifest;
  errors: string[];
}

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

function assertUncompressedSize(entry: AdmZip.IZipEntry): void {
  if (entry.header.size > ARCHIVE_ENTRY_MAX_SIZE_BYTES) {
    throw new WorkflowArchiveError(
      `Entry [${entry.entryName}] exceeds the uncompressed size limit of ${ARCHIVE_ENTRY_MAX_SIZE_BYTES} bytes`
    );
  }
}

function assertSafePath(entryName: string): void {
  const normalized = path.normalize(entryName);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new WorkflowArchiveError(
      `Entry [${entryName}] contains a path traversal and was rejected`
    );
  }
}

/**
 * Parses a flat ZIP buffer into workflow entries and manifest. Validates:
 * - No path traversal (zip-slip)
 * - No nested directories (flat structure only)
 * - Uncompressed entry size within limits
 * - Only .yml/.yaml files allowed
 * - YAML content length within MAX_WORKFLOW_YAML_LENGTH
 * - Manifest is present and validates against schema
 */
export function parseWorkflowsArchive(
  buffer: Buffer,
  options?: { maxWorkflows?: number }
): ParsedWorkflowsArchive {
  const { maxWorkflows } = options ?? {};
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new WorkflowArchiveError('Invalid ZIP archive');
  }

  const allEntries = zip.getEntries();
  if (allEntries.length === 0) {
    throw new WorkflowArchiveError('ZIP archive is empty');
  }

  // Pass 1: find and validate the manifest before processing workflow entries.
  // This avoids false "manifest not found" errors when the maxWorkflows limit
  // is reached before the manifest entry is encountered.
  const manifestEntry = allEntries.find((e) => !e.isDirectory && e.entryName === MANIFEST_FILENAME);
  if (!manifestEntry) {
    throw new WorkflowArchiveError('ZIP archive does not contain a manifest.yml');
  }
  assertSafePath(manifestEntry.entryName);
  assertUncompressedSize(manifestEntry);
  const manifestRaw = manifestEntry.getData().toString('utf-8');
  const manifestParsed = WorkflowExportManifestSchema.safeParse(
    YAML.parse(manifestRaw, { maxAliasCount: 100 })
  );
  if (!manifestParsed.success) {
    throw new WorkflowArchiveError('Invalid or missing manifest in ZIP archive');
  }
  const manifest = manifestParsed.data;

  // Pass 2: process workflow entries with safety checks.
  const workflows: WorkflowExportEntry[] = [];
  const errors: string[] = [];
  let totalDecompressedBytes = manifestEntry.header.size;

  for (const entry of allEntries) {
    if (entry.isDirectory || entry.entryName === MANIFEST_FILENAME) {
      // eslint-disable-next-line no-continue
      continue;
    }

    assertSafePath(entry.entryName);
    assertUncompressedSize(entry);

    totalDecompressedBytes += entry.header.size;
    if (totalDecompressedBytes > ARCHIVE_TOTAL_MAX_SIZE_BYTES) {
      throw new WorkflowArchiveError(
        `Archive exceeds the total decompressed size limit of ${ARCHIVE_TOTAL_MAX_SIZE_BYTES} bytes`
      );
    }

    if (entry.entryName.includes('/')) {
      errors.push(`Unexpected nested entry [${entry.entryName}]`);
    } else if (!entry.entryName.endsWith('.yml') && !entry.entryName.endsWith('.yaml')) {
      errors.push(`Entry [${entry.entryName}] is not a .yml or .yaml file`);
    } else if (maxWorkflows !== undefined && workflows.length >= maxWorkflows) {
      errors.push(`Maximum workflow limit of ${maxWorkflows} reached; remaining entries skipped`);
      break;
    } else {
      const ext = entry.entryName.endsWith('.yaml') ? '.yaml' : '.yml';
      const id = entry.entryName.slice(0, -ext.length);
      if (!isValidWorkflowId(id)) {
        errors.push(
          `Entry [${entry.entryName}] has an invalid workflow ID: must match [a-zA-Z0-9._-] and be 1-255 characters`
        );
      } else {
        const yaml = entry.getData().toString('utf-8');
        if (yaml.length > MAX_WORKFLOW_YAML_LENGTH) {
          errors.push(
            `Entry [${entry.entryName}] exceeds the maximum YAML length of ${MAX_WORKFLOW_YAML_LENGTH} characters`
          );
        } else {
          workflows.push({ id, yaml });
        }
      }
    }
  }

  return { workflows, manifest, errors };
}
