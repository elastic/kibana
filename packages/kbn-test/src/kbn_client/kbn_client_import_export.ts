/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import Fs from 'fs/promises';
import Path from 'path';

import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { lastValueFrom } from '@kbn/std';
import FormData from 'form-data';
import { ToolingLog, isAxiosResponseError, createFailError } from '@kbn/dev-utils';

import { KbnClientRequester, uriencode, ReqOptions } from './kbn_client_requester';

interface ImportApiResponse {
  success: boolean;
  [key: string]: unknown;
}

interface FindApiResponse {
  saved_objects: SavedObject[];
  total: number;
  per_page: number;
  page: number;
}

interface SavedObject {
  id: string;
  type: string;
  [key: string]: unknown;
}

async function parseArchive(path: string): Promise<SavedObject[]> {
  return (await Fs.readFile(path, 'utf-8'))
    .split('\n\n')
    .filter((line) => !!line)
    .map((line) => JSON.parse(line));
}

async function concurrently<T>(maxConcurrency: number, arr: T[], fn: (item: T) => Promise<void>) {
  await lastValueFrom(Rx.from(arr).pipe(mergeMap(async (item) => await fn(item), maxConcurrency)));
}

export class KbnClientImportExport {
  constructor(
    public readonly log: ToolingLog,
    public readonly requester: KbnClientRequester,
    public readonly dir?: string
  ) {}

  private resolvePath(path: string) {
    if (!Path.extname(path)) {
      path = `${path}.json`;
    }

    if (!this.dir && !Path.isAbsolute(path)) {
      throw new Error(
        'unable to resolve relative path to import/export without a configured dir, either path absolute path or specify --dir'
      );
    }

    return this.dir ? Path.resolve(this.dir, path) : path;
  }

  async load(name: string, options?: { space?: string }) {
    const src = this.resolvePath(name);
    this.log.debug('resolved import for', name, 'to', src);

    const objects = await parseArchive(src);
    this.log.info('importing', objects.length, 'saved objects', { space: options?.space });

    const formData = new FormData();
    formData.append('file', objects.map((obj) => JSON.stringify(obj)).join('\n'), 'import.ndjson');

    // TODO: should we clear out the existing saved objects?
    const resp = await this.req<ImportApiResponse>(options?.space, {
      method: 'POST',
      path: '/api/saved_objects/_import',
      query: {
        overwrite: true,
      },
      body: formData,
      headers: formData.getHeaders(),
    });

    if (resp.data.success) {
      this.log.success('import success');
    } else {
      throw createFailError(`failed to import all saved objects: ${inspect(resp.data)}`);
    }
  }

  async clean(options: { types: string[]; space?: string }) {
    this.log.debug('cleaning all saved objects', { space: options?.space });

    let deleted = 0;

    while (true) {
      const resp = await this.req<FindApiResponse>(options.space, {
        method: 'GET',
        path: '/api/saved_objects/_find',
        query: {
          per_page: 1000,
          type: options.types,
          fields: 'none',
        },
      });

      this.log.info('deleting batch of', resp.data.saved_objects.length, 'objects');
      const deletion = await this.deleteObjects(options.space, resp.data.saved_objects);
      deleted += deletion.deleted;

      if (resp.data.total < resp.data.per_page) {
        break;
      }
    }

    this.log.success('deleted', deleted, 'objects');
  }

  async unload(name: string, options?: { space?: string }) {
    const src = this.resolvePath(name);
    this.log.debug('unloading docs from archive at', src);

    const objects = await parseArchive(src);
    this.log.info('deleting', objects.length, 'objects', { space: options?.space });

    const { deleted, missing } = await this.deleteObjects(options?.space, objects);

    if (missing) {
      this.log.info(missing, 'saved objects were already deleted');
    }

    this.log.success(deleted, 'saved objects deleted');
  }

  async save(name: string, options: { types: string[]; space?: string }) {
    const dest = this.resolvePath(name);
    this.log.debug('saving export to', dest);

    const resp = await this.req(options.space, {
      method: 'POST',
      path: '/api/saved_objects/_export',
      body: {
        type: options.types,
        excludeExportDetails: true,
        includeReferencesDeep: true,
      },
    });

    if (typeof resp.data !== 'string') {
      throw createFailError(`unexpected response from export API: ${inspect(resp.data)}`);
    }

    const objects = resp.data
      .split('\n')
      .filter((l) => !!l)
      .map((line) => JSON.parse(line));

    const fileContents = objects.map((obj) => JSON.stringify(obj, null, 2)).join('\n\n');

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
      if (!isAxiosResponseError(error)) {
        throw error;
      }

      throw createFailError(
        `${error.response.status} resp: ${inspect(error.response.data)}\nreq: ${inspect(
          error.config
        )}`
      );
    }
  }

  private async deleteObjects(space: string | undefined, objects: SavedObject[]) {
    let deleted = 0;
    let missing = 0;

    await concurrently(20, objects, async (obj) => {
      try {
        await this.requester.request({
          method: 'DELETE',
          path: space
            ? uriencode`/s/${space}/api/saved_objects/${obj.type}/${obj.id}`
            : uriencode`/api/saved_objects/${obj.type}/${obj.id}`,
        });
        deleted++;
      } catch (error) {
        if (isAxiosResponseError(error)) {
          if (error.response.status === 404) {
            missing++;
            return;
          }

          throw createFailError(`${error.response.status} resp: ${inspect(error.response.data)}`);
        }

        throw error;
      }
    });

    return { deleted, missing };
  }
}
