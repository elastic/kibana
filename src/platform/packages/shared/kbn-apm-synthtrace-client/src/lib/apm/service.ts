/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenTelemetryAgentName } from '../../types/agent_names';
import { Entity } from '../entity';
import { ApmFields } from './apm_fields';
import { Instance } from './instance';
import { OtelService, OtelServiceParams } from './otel';

export class Service extends Entity<ApmFields> {
  instance(instanceName: string) {
    return new Instance({
      ...this.fields,
      ['service.node.name']: instanceName,
      'host.name': instanceName,
    });
  }
}

export function service(
  name: string,
  environment: string,
  agentName: string | OpenTelemetryAgentName
): Service;

export function service(
  options: { name: string; environment: string } & (
    | { agentName: string }
    | { agentName: OpenTelemetryAgentName }
  )
): Service;

export function service(
  ...args:
    | [{ name: string; environment: string; agentName: string | OpenTelemetryAgentName }]
    | [string, string, string]
) {
  const [serviceName, environment, agentName] =
    args.length === 1 ? [args[0].name, args[0].environment, args[0].agentName] : args;

  return new Service({
    'service.name': serviceName,
    'service.environment': environment,
    'agent.name': agentName,
  });
}

// otel native/edot
export function otelService(options: OtelServiceParams) {
  return new OtelService({
    name: options.name,
    sdkLanguage: options.sdkLanguage,
    sdkName: options.sdkName,
    distro: options.distro,
    namespace: options.namespace,
  });
}
