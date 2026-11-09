/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

/** One change `oasdiff changelog` reports between two OpenAPI documents. */
export interface OasdiffEntry {
  readonly id: string;
  readonly text: string;
  /** 1 for info, 2 for warning, 3 for error (breaking). */
  readonly level: number;
  /** The HTTP method, e.g. `GET`, for changes to an operation. */
  readonly operation?: string;
  readonly path?: string;
}

/** Lists the changes from one OpenAPI document to another; undefined without an `oasdiff`. */
export type DiffSpecs = (base: string, current: string) => Promise<OasdiffEntry[] | undefined>;

const MAX_BUFFER = 50 * 1024 * 1024;

const run = (bin: string, args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(bin, args, { maxBuffer: MAX_BUFFER }, (error, stdout) =>
      error ? reject(error) : resolve(stdout)
    );
  });

/**
 * Runs `oasdiff changelog` on two documents given as text. The binary is `OASDIFF_BIN`, else
 * `oasdiff` on the `PATH`, as for `@kbn/api-contracts`; Kibana's CI agents have it installed.
 */
export const createOasdiff =
  (bin = process.env.OASDIFF_BIN ?? 'oasdiff'): DiffSpecs =>
  async (base, current) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'connector-drift-'));
    try {
      const [basePath, currentPath] = ['base.json', 'current.json'].map((file) =>
        path.join(directory, file)
      );
      await fs.writeFile(basePath, base);
      await fs.writeFile(currentPath, current);
      const output = await run(bin, ['changelog', basePath, currentPath, '--format', 'json']);
      const trimmed = output.trim();
      return trimmed ? (JSON.parse(trimmed) as OasdiffEntry[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  };
