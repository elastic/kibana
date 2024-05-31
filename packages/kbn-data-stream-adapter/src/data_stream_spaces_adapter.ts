/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createOrUpdateComponentTemplate } from './create_or_update_component_template';
import { createDataStream, updateDataStreams } from './create_or_update_data_stream';
import { createOrUpdateIndexTemplate } from './create_or_update_index_template';
import {
  DataStreamAdapter,
  type DataStreamAdapterParams,
  type InstallParams,
} from './data_stream_adapter';

export class DataStreamSpacesAdapter extends DataStreamAdapter {
  private installedSpaceDataStreamName: Map<string, Promise<string>>;
  private _installSpace?: (spaceId: string) => Promise<string>;

  constructor(private readonly prefix: string, options: DataStreamAdapterParams) {
    super(`${prefix}-*`, options); // make indexTemplate `indexPatterns` match all data stream space names
    this.installedSpaceDataStreamName = new Map();
  }

  public async install({
    logger,
    esClient: esClientToResolve,
    pluginStop$,
    tasksTimeoutMs,
  }: InstallParams) {
    this.installed = true;

    const esClient = await esClientToResolve;
    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // Install component templates in parallel
    await Promise.all(
      this.componentTemplates.map((componentTemplate) =>
        installFn(
          createOrUpdateComponentTemplate({
            template: componentTemplate,
            esClient,
            logger,
            totalFieldsLimit: this.totalFieldsLimit,
          }),
          `create or update ${componentTemplate.name} component template`
        )
      )
    );

    // Install index templates in parallel
    await Promise.all(
      this.indexTemplates.map((indexTemplate) =>
        installFn(
          createOrUpdateIndexTemplate({ template: indexTemplate, esClient, logger }),
          `create or update ${indexTemplate.name} index template`
        )
      )
    );

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
    this._installSpace = async (spaceId: string) => {
      const existingInstallPromise = this.installedSpaceDataStreamName.get(spaceId);
      if (existingInstallPromise) {
        return existingInstallPromise;
      }
      const name = `${this.prefix}-${spaceId}`;
      const installPromise = installFn(
        createDataStream({ name, esClient, logger }),
        `create ${name} data stream`
      ).then(() => name);

      this.installedSpaceDataStreamName.set(spaceId, installPromise);
      return installPromise;
    };
  }

  public async installSpace(spaceId: string): Promise<string> {
    if (!this._installSpace) {
      throw new Error('Cannot installSpace before install');
    }
    return this._installSpace(spaceId);
  }

  public async getInstalledSpaceName(spaceId: string): Promise<string | undefined> {
    return this.installedSpaceDataStreamName.get(spaceId);
  }
}
