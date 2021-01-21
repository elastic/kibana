/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog } from '../tooling_log';

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
    this.log.debug('Gettings saved object: %j', options);

    const { data } = await this.requester.request<SavedObjectResponse<Attributes>>({
      description: 'get saved object',
      path: uriencode`/api/saved_objects/${options.type}/${options.id}`,
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
      path: uriencode`/api/saved_objects/${options.type}/${options.id}`,
      method: 'DELETE',
    });

    return data;
  }
}
