/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesIndexSettings,
  IndicesPutIndexTemplateIndexTemplateMapping,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import type { FieldMap } from './field_maps/types';
import { createOrUpdateComponentTemplate } from './create_or_update_component_template';
import { createOrUpdateDataStream } from './create_or_update_data_stream';
import { createOrUpdateIndexTemplate } from './create_or_update_index_template';
import { installWithTimeout } from './install_with_timeout';
import { getComponentTemplate, getIndexTemplate } from './resource_installer_utils';

export interface DataStreamParams {
  kibanaVersion: string;
  totalFieldsLimit?: number;
}
export interface SetComponentTemplateParams {
  name: string;
  fieldMap: FieldMap;
  settings?: IndicesIndexSettings;
  dynamic?: 'strict' | boolean;
}
export interface SetIndexTemplateParams {
  name: string;
  componentTemplateRefs?: string[];
  namespace?: string;
  template?: IndicesPutIndexTemplateIndexTemplateMapping;
  hidden?: boolean;
}

export interface GetInstallFnParams {
  logger: Logger;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}
export interface InstallParams {
  logger: Logger;
  esClient: ElasticsearchClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

const DEFAULT_FIELDS_LIMIT = 2500;

export class DataStream {
  protected readonly kibanaVersion: string;
  protected readonly totalFieldsLimit: number;
  protected componentTemplates: ClusterPutComponentTemplateRequest[] = [];
  protected indexTemplates: IndicesPutIndexTemplateRequest[] = [];
  protected installed: boolean;

  constructor(protected readonly name: string, options: DataStreamParams) {
    this.installed = false;
    this.kibanaVersion = options.kibanaVersion;
    this.totalFieldsLimit = options.totalFieldsLimit ?? DEFAULT_FIELDS_LIMIT;
  }

  public getName() {
    return this.name;
  }

  public setComponentTemplate(params: SetComponentTemplateParams) {
    if (this.installed) {
      throw new Error('Cannot set component template after install');
    }
    this.componentTemplates.push(getComponentTemplate(params));
  }

  public setIndexTemplate(params: SetIndexTemplateParams) {
    if (this.installed) {
      throw new Error('Cannot set index template after install');
    }
    this.indexTemplates.push(
      getIndexTemplate({
        ...params,
        indexPatterns: [this.name],
        kibanaVersion: this.kibanaVersion,
        totalFieldsLimit: this.totalFieldsLimit,
      })
    );
  }

  protected getInstallFn({ logger, pluginStop$, tasksTimeoutMs }: GetInstallFnParams) {
    return async (promise: Promise<void>, description?: string) =>
      installWithTimeout({
        installFn: () => promise,
        logger,
        timeoutMs: tasksTimeoutMs,
        pluginStop$,
        description,
      });
  }

  public async install({ logger, esClient, pluginStop$, tasksTimeoutMs }: InstallParams) {
    if (this.installed) {
      throw new Error('Cannot re-install data stream');
    }
    this.installed = true;

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
          `${componentTemplate.name} component template`
        )
      )
    );

    // Install index templates in parallel
    await Promise.all(
      this.indexTemplates.map((indexTemplate) =>
        installFn(
          createOrUpdateIndexTemplate({
            template: indexTemplate,
            esClient,
            logger,
          }),
          `${indexTemplate.name} index template`
        )
      )
    );

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
