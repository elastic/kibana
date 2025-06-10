/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client, estypes } from '@elastic/elasticsearch';
import { ApmFields, ApmOtelFields, ApmSynthtracePipelines } from '@kbn/apm-synthtrace-client';
import { ValuesType } from 'utility-types';
import { SynthtraceEsClient, SynthtraceEsClientOptions } from '../../../shared/base_client';
import { Logger } from '../../../utils/create_logger';
import { apmPipeline } from './apm_pipeline';
import { apmToOtelPipeline } from './otel/apm_to_otel_pipeline';
import { otelToApmPipeline } from './otel/otel_to_apm_pipeline';

export enum ComponentTemplateName {
  LogsApp = 'logs-apm.app@custom',
  LogsError = 'logs-apm.error@custom',
  MetricsApp = 'metrics-apm.app@custom',
  MetricsInternal = 'metrics-apm.internal@custom',
  TracesApm = 'traces-apm@custom',
  TracesApmRum = 'traces-apm.rum@custom',
  TracesApmSampled = 'traces-apm.sampled@custom',
}

interface Pipeline {
  includeSerialization?: boolean;
  versionOverride?: string;
}

export interface ApmSynthtraceEsClientOptions extends Omit<SynthtraceEsClientOptions, 'pipeline'> {
  version: string;
}

export class ApmSynthtraceEsClient extends SynthtraceEsClient<ApmFields | ApmOtelFields> {
  public readonly version: string;

  constructor(
    options: { client: Client; logger: Logger; pipeline?: Pipeline } & ApmSynthtraceEsClientOptions
  ) {
    super({
      ...options,
      pipeline: apmPipeline(
        options.logger,
        options.pipeline?.versionOverride ?? options.version,
        options.pipeline?.includeSerialization
      ),
    });
    this.dataStreams = [
      'traces-apm*',
      'metrics-apm*',
      'logs-apm*',
      'metrics-*.otel*',
      'traces-*.otel*',
      'logs-*.otel*',
    ];
    this.version = options.version;
  }

  async updateComponentTemplate(
    name: ComponentTemplateName,
    modify: (
      template: ValuesType<
        estypes.ClusterGetComponentTemplateResponse['component_templates']
      >['component_template']['template']
    ) => estypes.ClusterPutComponentTemplateRequest['template']
  ) {
    const response = await this.client.cluster.getComponentTemplate({
      name,
    });

    await Promise.all(
      response.component_templates.map((template) => {
        return this.client.cluster.putComponentTemplate({
          name: template.name,
          template: {
            ...modify(template.component_template.template),
          },
        });
      })
    );

    this.logger.info(`Updated component template: ${name}`);
  }

  resolvePipelineType(
    pipeline: ApmSynthtracePipelines,
    options: {
      includeSerialization?: boolean;
      versionOverride?: string;
    } = { includeSerialization: true }
  ) {
    switch (pipeline) {
      case 'otel': {
        return otelToApmPipeline(this.logger, options.includeSerialization);
      }
      case 'apmToOtel': {
        return apmToOtelPipeline(
          this.logger,
          options.versionOverride ?? this.version,
          options.includeSerialization
        );
      }
      default: {
        return apmPipeline(
          this.logger,
          options.versionOverride ?? this.version,
          options.includeSerialization
        );
      }
    }
  }
}
