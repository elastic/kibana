/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createIndex, updateIndices } from './create_or_update_index';
import { IndexAdapter, type IndexAdapterParams, type InstallParams } from './index_adapter';

export type InstallIndex = (indexSuffix: string) => Promise<void>;

export class IndexPatternAdapter extends IndexAdapter {
  protected installedIndexName: Map<string, Promise<string>>;
  protected installIndexPromise?: Promise<InstallIndex>;

  constructor(protected readonly prefix: string, options: IndexAdapterParams) {
    super(`${prefix}-*`, options); // make indexTemplate `indexPatterns` match all index names
    this.installedIndexName = new Map();
  }

  /** Method to create/update the templates, update existing indices and setup internal state for the adapter. */
  public async install(params: InstallParams): Promise<void> {
    this.installIndexPromise = this._install(params);
    await this.installIndexPromise;
  }

  protected async _install(params: InstallParams): Promise<InstallIndex> {
    const { logger, pluginStop$, tasksTimeoutMs } = params;

    await this.installTemplates(params);

    const esClient = await params.esClient;
    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // Update existing specific indices
    await installFn(
      updateIndices({
        name: this.name, // `${prefix}-*`
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
      }),
      `update specific indices`
    );

    // Define the function to create concrete indices on demand
    return async (name: string) =>
      installFn(createIndex({ name, esClient, logger }), `create ${name} index`);
  }

  /**
   * Method to create the index for a given index suffix. It will be created only if it does not exist.
   * @param indexSuffix The suffix of the index name
   * @returns A promise that resolves with the full index name.
   */
  public async createIndex(indexSuffix: string): Promise<string> {
    if (!this.installIndexPromise) {
      throw new Error('Cannot installIndex before install');
    }

    const existingInstallPromise = this.installedIndexName.get(indexSuffix);
    if (existingInstallPromise) {
      // return the existing promise so we don't try to install the same index multiple times for concurrent requests
      return existingInstallPromise;
    }
    const indexName = this.getIndexName(indexSuffix);

    // Awaits for installIndexPromise to resolve to ensure templates are installed before the specific index is created.
    // This is a safety measure since the initial `install` call may not be awaited from the plugin lifecycle caller.
    // However, the promise will most likely be already fulfilled by the time `createIndex` is called, so this is a no-op.
    const installPromise = this.installIndexPromise
      .then((installIndex) => installIndex(indexName))
      .then(() => indexName)
      .catch((err) => {
        this.installedIndexName.delete(indexSuffix);
        throw err;
      });

    this.installedIndexName.set(indexSuffix, installPromise);
    await installPromise;
    return indexName;
  }

  public getIndexName(indexSuffix: string): string {
    return `${this.prefix}-${indexSuffix}`;
  }

  /** Method to get the full index name for a given index suffix. Ii won't create the index if it does not exist. */
  public async getInstalledIndexName(indexSuffix: string): Promise<string | undefined> {
    return this.installedIndexName.get(indexSuffix);
  }
}
