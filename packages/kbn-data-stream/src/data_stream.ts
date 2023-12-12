/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ClusterPutComponentTemplateRequest,
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
  includeSettings?: boolean;
}
export interface SetIndexTemplateParams {
  name: string;
  componentTemplateRefs: string[];
  namespace?: string;
  template?: IndicesPutIndexTemplateIndexTemplateMapping;
}
export interface InstallParams {
  logger: Logger;
  esClient: ElasticsearchClient;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

const DEFAULT_FIELDS_LIMIT = 2500;

export class DataStream {
  private readonly kibanaVersion: string;
  private readonly totalFieldsLimit: number;
  private componentTemplates: ClusterPutComponentTemplateRequest[] = [];
  private indexTemplates: IndicesPutIndexTemplateRequest[] = [];
  private installed: boolean;

  constructor(private readonly name: string, options: DataStreamParams) {
    this.installed = false;
    this.kibanaVersion = options.kibanaVersion;
    this.totalFieldsLimit = options.totalFieldsLimit ?? DEFAULT_FIELDS_LIMIT;
  }

  public getName() {
    return this.name;
  }

  public setComponentTemplate({ name, fieldMap, includeSettings }: SetComponentTemplateParams) {
    if (this.installed) {
      throw new Error(`Cannot set component template after install`);
    }
    this.componentTemplates.push(getComponentTemplate({ name, fieldMap, includeSettings }));
  }

  public setIndexTemplate({
    name,
    componentTemplateRefs,
    template,
    namespace = 'default',
  }: SetIndexTemplateParams) {
    if (this.installed) {
      throw new Error(`Cannot set index template after install`);
    }
    this.indexTemplates.push(
      getIndexTemplate({
        name,
        template,
        componentTemplateRefs,
        indexPatterns: [this.name],
        kibanaVersion: this.kibanaVersion,
        totalFieldsLimit: this.totalFieldsLimit,
        namespace,
      })
    );
  }

  public async install({ logger, esClient, pluginStop$, tasksTimeoutMs }: InstallParams) {
    this.installed = true;

    const promiseWithTimeout = async (promise: Promise<void>, description?: string) =>
      installWithTimeout({
        installFn: () => promise,
        logger,
        timeoutMs: tasksTimeoutMs,
        pluginStop$,
        description,
      });

    // Install component templates in parallel
    await Promise.all(
      this.componentTemplates.map((componentTemplate) =>
        promiseWithTimeout(
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
        promiseWithTimeout(
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
    await promiseWithTimeout(
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
