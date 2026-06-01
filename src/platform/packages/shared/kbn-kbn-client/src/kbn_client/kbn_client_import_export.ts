/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';
import Fs from 'fs/promises';
import { existsSync } from 'fs';
import Path from 'path';

import { createFailError } from '@kbn/dev-cli-errors';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { KbnClientRequesterError } from './kbn_client_requester_error';

import { KbnClientRequester, uriencode, ReqOptions } from './kbn_client_requester';
import { KbnClientSavedObjects } from './kbn_client_saved_objects';
import { parseArchive } from './import_export/parse_archive';

interface ImportApiResponse {
  success: boolean;
  [key: string]: unknown;
}

export class KbnClientImportExport {
  constructor(
    public readonly log: ToolingLog,
    public readonly requester: KbnClientRequester,
    public readonly savedObjects: KbnClientSavedObjects,
    public readonly baseDir: string = REPO_ROOT
  ) {}

  private resolvePath(path: string) {
    if (!Path.extname(path)) {
      path = `${path}.json`;
    }

    return Path.resolve(this.baseDir, path);
  }

  private resolveAndValidatePath(path: string) {
    const absolutePath = this.resolvePath(path);

    if (!existsSync(absolutePath)) {
      throw new Error(
        `unable to resolve path [${path}] to import/export, resolved relative to [${this.baseDir}]`
      );
    }

    return absolutePath;
  }

  async load(path: string, options?: { space?: string; createNewCopies?: boolean }) {
    const src = this.resolveAndValidatePath(path);
    this.log.debug('resolved import for', path, 'to', src);

    const objects = await parseArchive(src);
    this.log.info('importing', objects.length, 'saved objects', { space: options?.space });

    // Use the native (WHATWG) FormData + Blob so fetch handles the multipart
    // boundary itself. The legacy `form-data` package produced a Node Readable
    // stream with a hand-rolled boundary, that worked with axios but is brittle
    // with undici's fetch (the request helper would JSON.stringify the stream).
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([objects.map((obj) => JSON.stringify(obj)).join('\n')], {
        type: 'application/ndjson',
      }),
      'import.ndjson'
    );

    const query = options?.createNewCopies ? { createNewCopies: true } : { overwrite: true };

    // TODO: should we clear out the existing saved objects?
    const resp = await this.req<ImportApiResponse>(options?.space, {
      method: 'POST',
      path: '/api/saved_objects/_import',
      query,
      body: formData,
    });

    if (resp.data.success) {
      this.log.success('import success');
      return resp.data;
    } else {
      throw createFailError(
        `failed to import all saved objects: ${inspect(resp.data, {
          compact: false,
          depth: 99,
          breakLength: 80,
          sorted: true,
        })}`
      );
    }
  }

  async unload(path: string, options?: { space?: string }) {
    const src = this.resolveAndValidatePath(path);
    this.log.debug('unloading docs from archive at', src);

    const objects = await parseArchive(src, { stripSummary: true });
    this.log.info('deleting', objects.length, 'objects', { space: options?.space });

    const { deleted, missing } = await this.savedObjects.bulkDelete({
      space: options?.space,
      objects,
    });

    if (missing) {
      this.log.info(missing, 'saved objects were already deleted');
    }

    this.log.success(deleted, 'saved objects deleted');
  }

  async save(path: string, options: { types: string[]; space?: string }) {
    const dest = this.resolvePath(path);
    this.log.debug('saving export to', dest);

    const resp = await this.req(options.space, {
      method: 'POST',
      path: '/api/saved_objects/_export',
      body: {
        type: options.types,
        excludeExportDetails: true,
        includeReferencesDeep: true,
      },
      responseType: 'text',
    });

    if (typeof resp.data !== 'string') {
      throw createFailError(`unexpected response from export API: ${inspect(resp.data)}`);
    }

    const objects = resp.data
      .split('\n')
      .filter((l) => !!l)
      .map((line) => JSON.parse(line));

    const fileContents = objects
      .map((obj) => {
        const { sort: _, ...nonSortFields } = obj;
        return JSON.stringify(nonSortFields, null, 2);
      })
      .join('\n\n');

    await Fs.mkdir(Path.dirname(dest), { recursive: true });
    await Fs.writeFile(dest, fileContents, 'utf-8');

    this.log.success('Exported', objects.length, 'saved objects to', dest);
  }

  private async req<T>(space: string | undefined, options: ReqOptions) {
    if (!options.path.startsWith('/')) {
      throw new Error('options.path must start with a /');
    }

    try {
      return await this.requester.request<T>({
        ...options,
        path: space ? uriencode`/s/${space}` + options.path : options.path,
      });
    } catch (error) {
      // Translate KbnClientRequesterError into a "expected" CLI failure so the
      // dev tooling doesn't dump a noisy stack trace for plain HTTP errors. The
      // request URL and response body are already part of `error.message`.
      if (error instanceof KbnClientRequesterError && error.status !== undefined) {
        throw createFailError(error.message);
      }
      throw error;
    }
  }
}
