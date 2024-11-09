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

type InstallIndex = (indexSuffix: string) => Promise<string>;

export class IndexPatternAdapter extends IndexAdapter {
  protected installedIndexName: Map<string, Promise<string>>;
  protected installIndexPromise?: Promise<InstallIndex>;

  constructor(protected readonly prefix: string, options: IndexAdapterParams) {
    super(`${prefix}-*`, options); // make indexTemplate `indexPatterns` match all index names
    this.installedIndexName = new Map();
  }

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

    // define function to install indices on demand
    const installIndex = async (indexSuffix: string) => {
      const existingInstallPromise = this.installedIndexName.get(indexSuffix);
      if (existingInstallPromise) {
        return existingInstallPromise;
      }
      const name = `${this.prefix}-${indexSuffix}`;
      const namePromise = installFn(
        createIndex({ name, esClient, logger }),
        `create ${name} index`
      ).then(() => name);
      this.installedIndexName.set(indexSuffix, namePromise);
      return namePromise;
    };
    return installIndex;
  }

  public async installIndex(indexSuffix: string): Promise<string> {
    if (!this.installIndexPromise) {
      throw new Error('Cannot installIndex before install');
    }
    // Awaits for installIndexPromise to resolve to ensure templates are installed before the specific index is created.
    // This is a safety measure since the initial `install` call may not be awaited from the plugin lifecycle caller.
    // However, the promise will most likely be already fulfilled by the time `installIndex` is called, so this is a no-op.
    const installIndex = await this.installIndexPromise;
    return installIndex(indexSuffix);
  }

  public async getInstalledIndexName(indexSuffix: string): Promise<string | undefined> {
    return this.installedIndexName.get(indexSuffix);
  }
}
