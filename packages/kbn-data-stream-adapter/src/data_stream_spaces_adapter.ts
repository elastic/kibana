/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IndexPatternAdapter, type InstallParams } from '@kbn/index-adapter';
import { createDataStream, updateDataStreams } from './create_or_update_data_stream';

type InstallSpace = (spaceId: string) => Promise<string>;

export class DataStreamSpacesAdapter extends IndexPatternAdapter {
  protected async _install(params: InstallParams): Promise<InstallSpace> {
    const { logger, pluginStop$, tasksTimeoutMs } = params;

    await this.installTemplates(params);

    const esClient = await params.esClient;
    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // Update existing space data streams
    await installFn(
      updateDataStreams({
        name: `${this.prefix}-*`,
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
      }),
      `update space data streams`
    );

    // define function to install data stream for spaces on demand
    const installSpace = async (spaceId: string) => {
      const existingInstallPromise = this.installedIndexName.get(spaceId);
      if (existingInstallPromise) {
        return existingInstallPromise;
      }
      const name = `${this.prefix}-${spaceId}`;
      const namePromise = installFn(
        createDataStream({ name, esClient, logger }),
        `create ${name} data stream`
      ).then(() => name);
      this.installedIndexName.set(spaceId, namePromise);
      return namePromise;
    };
    return installSpace;
  }

  // This method has the same implementation as `installIndex` from the IndexPatternAdapter, but with a different signature.
  public async installSpace(spaceId: string): Promise<string> {
    if (!this.installIndexPromise) {
      throw new Error('Cannot installSpace before install');
    }
    // Awaits for installIndexPromise to resolve to ensure templates are installed before the space data stream is created.
    // This is a safety measure since the initial `install` call may not be awaited from the plugin lifecycle caller.
    // However, the promise will most likely be already fulfilled by the time `installSpace` is called, so this is a no-op.
    const installSpace = await this.installIndexPromise;
    return installSpace(spaceId);
  }

  // This method has the same implementation as `getInstalledIndexName` from the IndexPatternAdapter, but with a different signature.
  public async getInstalledSpaceName(spaceId: string): Promise<string | undefined> {
    return this.installedIndexName.get(spaceId);
  }
}
