/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import { mkdir, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';

const DEFAULT_TYPES = ['*'];
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_FILENAME_PREFIX = 'saved_objects_export';

interface ExportRequestBody {
  type: string[];
  includeReferencesDeep: boolean;
  excludeExportDetails: boolean;
  search?: string;
}

interface ExportTarget {
  exportUrl: URL;
  requestBody: ExportRequestBody;
  destinationPath: string;
  authHeader: string;
  timeoutMs: number;
}

async function ensureDirectory(outputDir: string): Promise<string> {
  const resolvedOutputDir = Path.resolve(process.cwd(), outputDir);

  try {
    const outputStats = await stat(resolvedOutputDir);
    if (!outputStats.isDirectory()) {
      throw createFlagError(`--out must reference a directory. Received ${resolvedOutputDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await mkdir(resolvedOutputDir, { recursive: true });
    } else {
      throw error;
    }
  }

  return resolvedOutputDir;
}

function buildExportUrl(rawUrl: string, spaceId?: string): URL {
  const baseUrl = new URL(rawUrl);
  const clonedUrl = new URL(baseUrl.toString());
  const basePath = clonedUrl.pathname.replace(/\/$/, '');
  const spacePath = spaceId ? `/s/${encodeURIComponent(spaceId)}` : '';
  const combinedPath = `${basePath}${spacePath}/api/saved_objects/_export`;

  clonedUrl.pathname = combinedPath.startsWith('/') ? combinedPath : `/${combinedPath}`;
  clonedUrl.search = '';
  clonedUrl.hash = '';

  return clonedUrl;
}

function resolveTypes(rawTypes?: string): string[] {
  if (!rawTypes) {
    return DEFAULT_TYPES;
  }

  const parsedTypes = rawTypes
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return parsedTypes.length > 0 ? parsedTypes : DEFAULT_TYPES;
}

function resolveFileName(providedFileName: string | undefined, targetUrl: URL): string {
  if (providedFileName) {
    return providedFileName.endsWith('.ndjson') ? providedFileName : `${providedFileName}.ndjson`;
  }

  const sanitizedHost = targetUrl.hostname.replace(/[^a-zA-Z0-9-]/g, '-');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${DEFAULT_FILENAME_PREFIX}-${sanitizedHost}-${timestamp}.ndjson`;
}

async function exportSavedObjects({
  exportUrl,
  requestBody,
  destinationPath,
  authHeader,
  timeoutMs,
}: ExportTarget) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(exportUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'saved-objects-export-cli',
        accept: 'application/ndjson',
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Export failed with status ${response.status} ${response.statusText}: ${responseText}`
      );
    }

    if (!response.body) {
      throw new Error('Export response did not include a body stream.');
    }

    // Stream the response body directly to disk to avoid buffering large exports in memory.
    const nodeStream = Readable.fromWeb(response.body as WebReadableStream<Uint8Array>);
    await pipeline(nodeStream, createWriteStream(destinationPath));
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Export request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

void run(
  async ({ log, flagsReader }) => {
    const targetUrl = flagsReader.requiredString('url');
    const outputDir = flagsReader.requiredString('out');
    const destinationDir = await ensureDirectory(outputDir);

    const apiKey = flagsReader.string('api-key');
    const username = flagsReader.string('username');
    const password = flagsReader.string('password');

    if (apiKey && (username || password)) {
      throw createFlagError('Provide either --api-key or --username/--password, not both.');
    }

    if (!apiKey && (!username || !password)) {
      throw createFlagError(
        'Authentication is required. Provide --api-key or both --username and --password.'
      );
    }

    const authHeader = apiKey
      ? `ApiKey ${apiKey}`
      : `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;

    const types = resolveTypes(flagsReader.string('types'));
    const includeReferencesDeep = flagsReader.boolean('include-references-deep');
    const excludeExportDetails = flagsReader.boolean('exclude-export-details');
    const search = flagsReader.string('search');
    const spaceId = flagsReader.string('space');
    const timeoutSeconds = flagsReader.number('timeout');
    let timeoutMs = DEFAULT_TIMEOUT_MS;
    if (
      typeof timeoutSeconds === 'number' &&
      Number.isFinite(timeoutSeconds) &&
      timeoutSeconds > 0
    ) {
      timeoutMs = timeoutSeconds * 1000;
    }

    const exportUrl = buildExportUrl(targetUrl, spaceId);
    const outputFileName = resolveFileName(flagsReader.string('file'), exportUrl);
    const destinationPath = Path.resolve(destinationDir, outputFileName);

    const requestBody: ExportRequestBody = {
      type: types,
      includeReferencesDeep,
      excludeExportDetails,
      ...(search ? { search } : {}),
    };

    log.info(`Exporting saved objects from ${exportUrl.toString()}...`);

    await exportSavedObjects({
      exportUrl,
      requestBody,
      destinationPath,
      authHeader,
      timeoutMs,
    });

    log.success(`Saved objects written to ${destinationPath}`);
  },
  {
    description: 'Export saved objects from a Kibana instance and store them on disk.',
    flags: {
      string: ['url', 'out', 'file', 'api-key', 'username', 'password', 'types', 'space', 'search'],
      boolean: ['include-references-deep', 'exclude-export-details'],
      help: `
        --url <url>                   Kibana URL to export from, including protocol and base path.
        --out <dir>                   Output directory where the NDJSON file will be written.
        --file <name>                 Optional file name for the export (defaults to a timestamped name).
        --api-key <key>               Kibana API key used for authentication.
        --username <user>             Username for basic authentication (requires --password).
        --password <pass>             Password for basic authentication (requires --username).
        --types <list>                Comma-separated list of saved object types to export (defaults to '*').
        --space <space>               Optional space identifier to export from.
        --search <query>              Optional KQL query that filters saved objects during export.
        --include-references-deep     Include references recursively (default: true).
        --exclude-export-details      Exclude export summary details (default: false).
        --timeout <seconds>           Timeout for the export request in seconds (default: 120).
      `,
      default: {
        'include-references-deep': true,
        'exclude-export-details': false,
      },
    },
  }
);
