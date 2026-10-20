/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';
import type { Recording, ResponseFixture } from '@kbn/connector-emulate';
import { z } from '@kbn/zod/v4';
import { responseOverridesSchema, toResponseFixtures } from './fixtures';

/** The folder of a connector's `vendor_api` that holds its recorded vendor responses. */
export const RECORDINGS = 'recordings';

const operationRefSchema = z
  .object({ source: z.string().optional(), method: z.string(), path: z.string() })
  .strict();

const recordingSchema = z
  .object({
    recordedAt: z.string().optional(),
    exchanges: z.array(
      z
        .object({
          operation: operationRefSchema,
          request: z
            .object({
              query: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
              headers: z.record(z.string(), z.string()).optional(),
              body: z.unknown().optional(),
            })
            .strict()
            .optional(),
          response: z
            .object({
              status: z.number().int(),
              headers: z.record(z.string(), z.string()).optional(),
              body: z.unknown().optional(),
            })
            .strict(),
        })
        .strict()
    ),
  })
  .strict();

const readJson = async <T>(file: string, schema: z.ZodType<T>): Promise<T> => {
  const text = await fs.readFile(file, 'utf8');
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`${file} doesn't have the expected shape:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};

/**
 * Reads response fixtures from a JSON file holding a list of `{ method, path, status, headers,
 * body, source }`, the format of the per-action `responses` in `fixtures.json`.
 */
export const readResponseFixtures = async (file: string): Promise<ResponseFixture[]> =>
  toResponseFixtures(await readJson(file, responseOverridesSchema));

/**
 * Reads recordings from a JSON file, or from every `.json` file of a folder in name order. With
 * `optional`, a missing file or folder reads as no recordings.
 */
export const readRecordings = async (
  fileOrFolder: string,
  { optional = false }: { readonly optional?: boolean } = {}
): Promise<Recording[]> => {
  let stats;
  try {
    stats = await fs.stat(fileOrFolder);
  } catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  if (!stats.isDirectory()) {
    return [await readJson(fileOrFolder, recordingSchema)];
  }
  const files = (await fs.readdir(fileOrFolder)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(files.map((name) => readJson(path.join(fileOrFolder, name), recordingSchema)));
};
