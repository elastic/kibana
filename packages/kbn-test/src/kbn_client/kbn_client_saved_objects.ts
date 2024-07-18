/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chunk } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  SavedObjectsBulkDeleteResponse,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';

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

interface FindOptions {
  type: string;
  space?: string;
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

interface CleanOptions {
  space?: string;
  types: string[];
}

interface CleanApiResponse {
  deleted: number;
}

interface DeleteObjectsOptions {
  space?: string;
  objects: Array<{
    type: string;
    id: string;
  }>;
}

const DELETE_CHUNK_SIZE = 50;

// add types here
const STANDARD_LIST_TYPES = [
  'url',
  'index-pattern',
  'action',
  'query',
  'alert',
  'graph-workspace',
  'tag',
  'visualization',
  'canvas-element',
  'canvas-workpad',
  'dashboard',
  'search',
  'lens',
  'links',
  'map',
  // cases saved objects
  'cases',
  'cases-comments',
  'cases-user-actions',
  'cases-configure',
  'cases-connector-mappings',
  // synthetics based objects
  'synthetics-monitor',
  'uptime-dynamic-settings',
  'synthetics-privates-locations',

  'osquery-saved-query',
  'osquery-pack',
  'infrastructure-ui-source',
  'metrics-data-source',
  'metrics-explorer-view',
  'inventory-view',
  'infrastructure-monitoring-log-view',
  'apm-indices',
  // Fleet saved object types
  'ingest-outputs',
  'ingest-download-sources',
  'ingest-agent-policies',
  'ingest-package-policies',
  'epm-packages',
  'epm-packages-assets',
  'fleet-preconfiguration-deletion-record',
  'fleet-fleet-server-host',
  'fleet-proxy',
  'fleet-uninstall-tokens',
  'fleet-space-settings',
];

/**
 * SO client for FTR.
 *
 * @remarks: Leverage the `ftrApis` plugin under the hood.
 */
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
        ? uriencode`/s/${options.space}/internal/ftr/kbn_client_so/${options.type}/${options.id}`
        : uriencode`/internal/ftr/kbn_client_so/${options.type}/${options.id}`,
      method: 'GET',
    });
    return data;
  }

  /**
   * Find saved objects
   */
  public async find<Attributes extends Record<string, any>>(options: FindOptions) {
    this.log.debug('Find saved objects: %j', options);

    const { data } = await this.requester.request<SavedObjectsFindResponse<Attributes>>({
      description: 'find saved objects',
      path: options.space
        ? uriencode`/s/${options.space}/internal/ftr/kbn_client_so/_find?type=${options.type}`
        : uriencode`/internal/ftr/kbn_client_so/_find?type=${options.type}`,
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
        ? uriencode`/internal/ftr/kbn_client_so/${options.type}/${options.id}`
        : uriencode`/internal/ftr/kbn_client_so/${options.type}`,
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
      path: uriencode`/internal/ftr/kbn_client_so/${options.type}/${options.id}`,
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
        ? uriencode`/s/${options.space}/internal/ftr/kbn_client_so/${options.type}/${options.id}`
        : uriencode`/internal/ftr/kbn_client_so/${options.type}/${options.id}`,
      method: 'DELETE',
    });

    return data;
  }

  public async clean(options: CleanOptions) {
    this.log.debug('Cleaning all saved objects', { space: options.space });

    const resp = await this.requester.request<CleanApiResponse>({
      method: 'POST',
      path: options.space
        ? uriencode`/s/${options.space}/internal/ftr/kbn_client_so/_clean`
        : `/internal/ftr/kbn_client_so/_clean`,
      body: {
        types: options.types,
      },
    });
    const deleted = resp.data.deleted;

    this.log.success('deleted', deleted, 'objects');
  }

  public async cleanStandardList(options?: { space?: string }) {
    const newOptions = { types: STANDARD_LIST_TYPES, space: options?.space };
    await this.clean(newOptions);
  }

  public async bulkDelete(options: DeleteObjectsOptions) {
    let deleted = 0;
    let missing = 0;

    const chunks = chunk(options.objects, DELETE_CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const objects = chunks[i];
      const { data: response } = await this.requester.request<SavedObjectsBulkDeleteResponse>({
        method: 'POST',
        path: options.space
          ? uriencode`/s/${options.space}/internal/ftr/kbn_client_so/_bulk_delete`
          : uriencode`/internal/ftr/kbn_client_so/_bulk_delete`,
        body: objects.map(({ type, id }) => ({ type, id })),
      });
      response.statuses.forEach((status) => {
        if (status.success) {
          deleted++;
        } else if (status.error?.statusCode === 404) {
          missing++;
        }
      });
    }

    return { deleted, missing };
  }
}
