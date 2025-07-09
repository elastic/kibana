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
import { Readable } from 'stream';
import { PipelineOptions } from '../../../../cli/utils/clients_manager';
import {
  SynthtraceEsClientBase,
  SynthtraceEsClient,
  SynthtraceEsClientOptions,
} from '../../../shared/base_client';
import { Logger } from '../../../utils/create_logger';
import { apmPipeline } from './apm_pipeline';
import { apmToOtelPipeline } from './otel/apm_to_otel_pipeline';
import { otelToApmPipeline } from './otel/otel_to_apm_pipeline';
import { PackageManagement } from '../../../shared/types';

export enum ComponentTemplateName {
  LogsApp = 'logs-apm.app@custom',
  LogsError = 'logs-apm.error@custom',
  MetricsApp = 'metrics-apm.app@custom',
  MetricsInternal = 'metrics-apm.internal@custom',
  TracesApm = 'traces-apm@custom',
  TracesApmRum = 'traces-apm.rum@custom',
  TracesApmSampled = 'traces-apm.sampled@custom',
}

interface ApmPipelineOptions extends PipelineOptions {
  versionOverride?: string;
}

export interface ApmSynthtraceEsClientOptions extends Omit<SynthtraceEsClientOptions, 'pipeline'> {
  version?: string;
}

export interface ApmSynthtraceEsClient
  extends SynthtraceEsClient<ApmFields | ApmOtelFields>,
    PackageManagement {
  updateComponentTemplate(
    name: ComponentTemplateName,
    modify: (
      template: ValuesType<
        estypes.ClusterGetComponentTemplateResponse['component_templates']
      >['component_template']['template']
    ) => estypes.ClusterPutComponentTemplateRequest['template']
  ): Promise<void>;
  resolvePipelineType(
    pipeline: ApmSynthtracePipelines,
    options?: ApmPipelineOptions
  ): (base: Readable) => NodeJS.WritableStream;
}

export class ApmSynthtraceEsClientImpl
  extends SynthtraceEsClientBase<ApmFields | ApmOtelFields>
  implements ApmSynthtraceEsClient
{
  private version: string = 'latest';
  constructor(
    private readonly options: {
      client: Client;
      logger: Logger;
    } & ApmSynthtraceEsClientOptions &
      PipelineOptions
  ) {
    super({
      ...options,
      pipeline: apmPipeline(options.logger, options.includePipelineSerialization, options.version),
    });
    this.dataStreams = [
      'traces-apm*',
      'metrics-apm*',
      'logs-apm*',
      'metrics-*.otel*',
      'traces-*.otel*',
      'logs-*.otel*',
    ];

    if (options.version) {
      this.version = options.version;
    }
  }

  async initializePackage(opts?: { version?: string; skipInstallation?: boolean }) {
    if (!this.fleetClient) {
      throw new Error(
        'ApmSynthtraceEsClient requires a FleetClient to be initialized. Please provide a valid Kibana client.'
      );
    }

    const { version = this.version, skipInstallation = true } = opts ?? {};

    const latestVersion =
      !version || version === 'latest'
        ? await this.fleetClient.fetchLatestPackageVersion('apm')
        : version;

    if (!skipInstallation) {
      await this.fleetClient.installPackage('apm', latestVersion);
    }

    this.logger.info(`Using package version: ${latestVersion}`);

    this.version = latestVersion;
    this.setPipeline(
      apmPipeline(this.options.logger, this.options.includePipelineSerialization, latestVersion)
    );

    return latestVersion;
  }

  async uninstallPackage() {
    if (!this.fleetClient) {
      throw new Error(
        'ApmSynthtraceEsClient requires a FleetClient to be initialized. Please provide a valid Kibana client.'
      );
    }
    await this.fleetClient.uninstallPackage('apm');
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
    options: ApmPipelineOptions = { includePipelineSerialization: true }
  ) {
    switch (pipeline) {
      case 'otel': {
        return otelToApmPipeline(this.logger, options.includePipelineSerialization);
      }
      case 'apmToOtel': {
        return apmToOtelPipeline(
          this.logger,
          options.includePipelineSerialization,
          options.versionOverride ?? this.version
        );
      }
      default: {
        return apmPipeline(
          this.logger,
          options.includePipelineSerialization,
          options.versionOverride ?? this.version
        );
      }
    }
  }
}
