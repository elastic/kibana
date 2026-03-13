/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { Readable } from 'stream';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import {
  detectFileFormat,
  isValidWorkflowId,
  MAX_IMPORT_PAYLOAD_BYTES,
  readStreamToBuffer,
} from './import_utils';

export interface HapiFileStream extends Readable {
  hapi: { filename: string };
}

export interface ParsedIncomingFile {
  format: 'zip' | 'yaml';
  buffer: Buffer;
  /** The workflow ID derived from the filename (YAML only). */
  fileId: string;
}

type ParseResult = { ok: true; data: ParsedIncomingFile } | { ok: false; error: IKibanaResponse };

/**
 * Shared boilerplate for import-related routes: validates the stream,
 * reads it into a buffer, detects the format, and derives a safe workflow
 * ID from the filename when the format is YAML.
 *
 * Returns `{ ok: false, error }` when validation fails — the caller must
 * return `error` to Kibana's router.
 */
export async function parseIncomingFile(
  fileStream: unknown,
  response: KibanaResponseFactory
): Promise<ParseResult> {
  if (!(fileStream instanceof Readable)) {
    return {
      ok: false,
      error: response.badRequest({ body: { message: 'Expected a readable file stream' } }),
    };
  }

  const buffer = await readStreamToBuffer(fileStream, MAX_IMPORT_PAYLOAD_BYTES);

  if (buffer.length === 0) {
    return {
      ok: false,
      error: response.badRequest({ body: { message: 'The uploaded file is empty' } }),
    };
  }

  const format = detectFileFormat(buffer);

  const hapiStream = fileStream as HapiFileStream;
  const filename = hapiStream.hapi?.filename ?? 'workflow.yml';
  const ext = path.extname(filename);
  const fileId = path.basename(filename, ext);

  if (format === 'yaml' && !isValidWorkflowId(fileId)) {
    return {
      ok: false,
      error: response.badRequest({
        body: {
          message:
            'The filename results in an invalid workflow ID: must start with an alphanumeric character and contain only [a-zA-Z0-9._-] (1-255 characters)',
        },
      }),
    };
  }

  return { ok: true, data: { format, buffer, fileId } };
}
