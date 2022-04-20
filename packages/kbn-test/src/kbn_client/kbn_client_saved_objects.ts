/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { isAxiosResponseError, createFailError } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';

import { KbnClientRequester, uriencode } from './kbn_client_requester';

type MigrationVersion = Record<string, string>;

interface Reference {
  id: string;
  name: string;
  type: string;
}

interface SavedObjectResponse<Attributes extends Record<string, any>> {
  attributes: Attributes;
  id: string;
  migrationVersion?: MigrationVersion;
  references: Reference[];
  type: string;
  updated_at?: string;
  version?: string;
}

interface GetOptions {
  type: string;
  id: string;
  space?: string;
}

interface IndexOptions<Attributes> {
  type: string;
  attributes: Attributes;
  id?: string;
  overwrite?: boolean;
  migrationVersion?: MigrationVersion;
  references?: Reference[];
}

interface UpdateOptions<Attributes> extends IndexOptions<Attributes> {
  id: string;
}

interface MigrateResponse {
  success: boolean;
  result: Array<{ status: string }>;
}

interface FindApiResponse {
  saved_objects: Array<{
    type: string;
    id: string;
    [key: string]: unknown;
  }>;
  total: number;
  per_page: number;
  page: number;
}

interface CleanOptions {
  space?: string;
  types: string[];
}

interface DeleteObjectsOptions {
  space?: string;
  objects: Array<{
    type: string;
    id: string;
  }>;
}

async function concurrently<T>(maxConcurrency: number, arr: T[], fn: (item: T) => Promise<void>) {
  if (arr.length) {
    await Rx.lastValueFrom(
      Rx.from(arr).pipe(mergeMap(async (item) => await fn(item), maxConcurrency))
    );
  }
}

export class KbnClientSavedObjects {
  constructor(private readonly log: ToolingLog, private readonly requester: KbnClientRequester) {}

  /**
   * Run the saved objects migration
   */
  public async migrate() {
    this.log.debug('Migrating saved objects');

    const { data } = await this.requester.request<MigrateResponse>({
      description: 'migrate saved objects',
      path: uriencode`/internal/saved_objects/_migrate`,
      method: 'POST',
      body: {},
    });
    return data;
  }

  /**
   * Get an object
   */
  public async get<Attributes extends Record<string, any>>(options: GetOptions) {
    this.log.debug('Getting saved object: %j', options);

    const { data } = await this.requester.request<SavedObjectResponse<Attributes>>({
      description: 'get saved object',
      path: options.space
        ? uriencode`/s/${options.space}/api/saved_objects/${options.type}/${options.id}`
        : uriencode`/api/saved_objects/${options.type}/${options.id}`,
      method: 'GET',
    });
    return data;
  }

  /**
   * Create a saved object
   */
  public async create<Attributes extends Record<string, any>>(options: IndexOptions<Attributes>) {
    this.log.debug('Creating saved object: %j', options);

    const { data } = await this.requester.request<SavedObjectResponse<Attributes>>({
      description: 'update saved object',
      path: options.id
        ? uriencode`/api/saved_objects/${options.type}/${options.id}`
        : uriencode`/api/saved_objects/${options.type}`,
      query: {
        overwrite: options.overwrite,
      },
      method: 'POST',
      body: {
        attributes: options.attributes,
        migrationVersion: options.migrationVersion,
        references: options.references,
      },
    });
    return data;
  }

  /**
   * Update a saved object
   */
  public async update<Attributes extends Record<string, any>>(options: UpdateOptions<Attributes>) {
    this.log.debug('Updating saved object: %j', options);

    const { data } = await this.requester.request<SavedObjectResponse<Attributes>>({
      description: 'update saved object',
      path: uriencode`/api/saved_objects/${options.type}/${options.id}`,
      query: {
        overwrite: options.overwrite,
      },
      method: 'PUT',
      body: {
        attributes: options.attributes,
        migrationVersion: options.migrationVersion,
        references: options.references,
      },
    });
    return data;
  }

  /**
   * Delete an object
   */
  public async delete(options: GetOptions) {
    this.log.debug('Deleting saved object %s/%s', options);

    const { data } = await this.requester.request({
      description: 'delete saved object',
      path: options.space
        ? uriencode`/s/${options.space}/api/saved_objects/${options.type}/${options.id}`
        : uriencode`/api/saved_objects/${options.type}/${options.id}`,
      method: 'DELETE',
    });

    return data;
  }

  public async clean(options: CleanOptions) {
    this.log.debug('Cleaning all saved objects', { space: options.space });

    let deleted = 0;

    while (true) {
      const resp = await this.requester.request<FindApiResponse>({
        method: 'GET',
        path: options.space
          ? uriencode`/s/${options.space}/api/saved_objects/_find`
          : '/api/saved_objects/_find',
        query: {
          per_page: 1000,
          type: options.types,
          fields: 'none',
        },
      });

      this.log.info('deleting batch of', resp.data.saved_objects.length, 'objects');
      const deletion = await this.bulkDelete({
        space: options.space,
        objects: resp.data.saved_objects,
      });
      deleted += deletion.deleted;

      if (resp.data.total <= resp.data.per_page) {
        break;
      }
    }

    this.log.success('deleted', deleted, 'objects');
  }

  public async cleanStandardList(options?: { space?: string }) {
    // add types here
    const types = [
      'search',
      'index-pattern',
      'visualization',
      'dashboard',
      'lens',
      'map',
      'graph-workspace',
      'query',
      'tag',
      'url',
      'canvas-workpad',
    ];
    const newOptions = { types, space: options?.space };
    await this.clean(newOptions);
  }

  public async bulkDelete(options: DeleteObjectsOptions) {
    let deleted = 0;
    let missing = 0;

    await concurrently(20, options.objects, async (obj) => {
      try {
        await this.requester.request({
          method: 'DELETE',
          path: options.space
            ? uriencode`/s/${options.space}/api/saved_objects/${obj.type}/${obj.id}?force=true`
            : uriencode`/api/saved_objects/${obj.type}/${obj.id}?force=true`,
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
