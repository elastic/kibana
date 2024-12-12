/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IndexAdapter, SetIndexTemplateParams, type InstallParams } from '@kbn/index-adapter';
import { createOrUpdateDataStream } from './create_or_update_data_stream';

export class DataStreamAdapter extends IndexAdapter {
  public setIndexTemplate(params: SetIndexTemplateParams) {
    super.setIndexTemplate({ ...params, isDataStream: true });
  }

  public async install(params: InstallParams) {
    this.installed = true;
    const { logger, pluginStop$, tasksTimeoutMs } = params;
    const esClient = await params.esClient;

    await this.installTemplates(params);

    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // create data stream when everything is ready
    await installFn(
      createOrUpdateDataStream({
        name: this.name,
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
      }),
      `${this.name} data stream`
    );
  }
}
