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

import { ToolingLog } from '../tooling_log';
import { KbnClientRequester, uriencode } from './kbn_client_requester';

export class KbnClientImportExport {
  constructor(
    public readonly log: ToolingLog,
    public readonly requester: KbnClientRequester,
    public readonly dir?: string
  ) {}

  resolvePath(path: string) {
    if (!Path.extname(path)) {
      path = `${path}.json`;
    }

    if (!this.dir && !Path.isAbsolute(path)) {
      throw new Error(
        '[KbnClientImportExport] unable to resolve relative path to import/export without a configured dir'
      );
    }

    return this.dir ? Path.resolve(this.dir, path) : Path.resolve(path);
  }

  async import(name: string, options?: { space?: string }) {
    const src = this.resolvePath(name);

    const flattenedJson = (await Fs.readFile(src, 'utf-8'))
      .split('\n\n')
      .map((json) => JSON.stringify(JSON.parse(json)))
      .join('\n');

    const formData = new FormData();
    formData.append('file', flattenedJson);

    // TODO: should we clear out the existing saved objects?

    await this.requester.request({
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

    // TODO: we should verify that the import was successfull by inspecting the response

    this.log.debug(`[KbnClientImportExport] import successful of ${src}`);
  }

  async export(name: string, options?: { space?: string }) {
    const dest = this.resolvePath(name);

    const resp = await this.requester.request({
      method: 'POST',
      path: options?.space
        ? uriencode`/s/${options.space}/api/saved_objects/_export`
        : '/api/saved_objects/_export',
    });

    if (typeof resp.data !== 'string' || !resp.data) {
      throw new Error(
        `[KbnClientImportExport] unexpected response from export API: ${inspect(resp.data)}`
      );
    }

    const objects = resp.data.split('\n').map((line) => JSON.parse(line));
    const fileContents = objects.map((obj) => JSON.stringify(obj, null, 2)).join('\n\n');

    await Fs.writeFile(dest, fileContents, 'utf-8');

    this.log.debug(`[KbnClientImportExport] Exported saved objects to destination:\n  ${dest}`);
  }
}
