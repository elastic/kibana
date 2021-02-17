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

import FormData from 'form-data';
import { ToolingLog, isAxiosResponseError, createFailError } from '@kbn/dev-utils';

import type { SavedObjectsImportResponse } from 'src/core/server/saved_objects/import/types';
import { KbnClientRequester, uriencode } from './kbn_client_requester';

const DEFAULT_SAVED_OBJECT_TYPES = ['index-pattern', 'search', 'visualization', 'dashboard'];

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
        '[KbnClientImportExport] unable to resolve relative path to import/export without a configured dir, either path absolute path or specify --dir'
      );
    }

    return this.dir ? Path.resolve(this.dir, path) : path;
  }

  async import(name: string, options?: { space?: string }) {
    const src = this.resolvePath(name);
    this.log.debug('resolved import for', name, 'to', src);

    const objects = (await Fs.readFile(src, 'utf-8'))
      .split('\n\n')
      .filter((line) => !!line)
      .map((line) => JSON.parse(line));

    this.log.info('importing', objects.length, 'saved objects');

    const formData = new FormData();
    formData.append('file', objects.map((obj) => JSON.stringify(obj)).join('\n'), 'import.ndjson');

    // TODO: should we clear out the existing saved objects?

    let resp;
    try {
      resp = await this.requester.request<SavedObjectsImportResponse>({
        method: 'POST',
        path: options?.space
          ? uriencode`/s/${options.space}/api/saved_objects/_import`
          : '/api/saved_objects/_import',
        query: {
          overwrite: true,
        },
        body: formData,
        headers: formData.getHeaders(),
      });
    } catch (error) {
      if (!isAxiosResponseError(error)) {
        throw error;
      }

      throw createFailError(
        `[KbnClientImportExport] ${error.response.status} resp: ${inspect(error.response.data)}`
      );
    }

    if (resp.data.success) {
      this.log.success('[KbnClientImportExport] import success');
    } else {
      throw createFailError(
        `[KbnClientImportExport] failed to import all saved objects: ${inspect(resp.data)}`
      );
    }
  }

  async export(name: string, options?: { savedObjectTypes?: string[]; space?: string }) {
    const dest = this.resolvePath(name);

    let resp;
    try {
      resp = await this.requester.request({
        method: 'POST',
        path: options?.space
          ? uriencode`/s/${options.space}/api/saved_objects/_export`
          : '/api/saved_objects/_export',
        body: {
          type: options?.savedObjectTypes ?? DEFAULT_SAVED_OBJECT_TYPES,
          excludeExportDetails: true,
        },
      });
    } catch (error) {
      if (!isAxiosResponseError(error)) {
        throw error;
      }

      throw createFailError(
        `[KbnClientImportExport] ${error.response.status} resp: ${inspect(error.response.data)}`
      );
    }

    if (typeof resp.data !== 'string' || !resp.data) {
      throw new Error(
        `[KbnClientImportExport] unexpected response from export API: ${inspect(resp.data)}`
      );
    }

    const objects = resp.data.split('\n').map((line) => JSON.parse(line));
    const fileContents = objects.map((obj) => JSON.stringify(obj, null, 2)).join('\n\n');

    await Fs.writeFile(dest, fileContents, 'utf-8');

    this.log.success(`[KbnClientImportExport] Exported saved objects to destination:\n  ${dest}`);
  }
}
