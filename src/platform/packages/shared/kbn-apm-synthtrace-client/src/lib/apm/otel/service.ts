/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Entity } from '../../entity';
import { ApmOtelFields } from './apm_otel_fields';
import { OtelInstance } from './otel_instance';

interface ServiceParams {
  name: string;
  namespace?: string;
  sdkName: 'opentelemetry' | 'otlp';
  sdkLanguage: string;
  distro?: 'elastic';
}
export class Service extends Entity<ApmOtelFields> {
  constructor({ name, namespace, sdkName, sdkLanguage, distro }: ServiceParams) {
    const agentName = `${sdkName}/${sdkLanguage}${distro ? `/${distro}` : ''}`;

    const fields: ApmOtelFields = {
      'attributes.service.name': name,
      'attributes.service.namespace': namespace,
      'resource.attributes.service.name': name,
      'resource.attributes.agent.name': agentName,
      'resource.attributes.service.namespace': namespace,
      'resource.attributes.deployment.environment': namespace,
      'resource.attributes.telemetry.sdk.name': sdkName,
      'resource.attributes.telemetry.sdk.language': sdkLanguage,
      'resource.attributes.telemetry.distro.name': distro,
      'scope.attributes.service.framework.name': name,
      'scope.name': name,
    };
    super(fields);
  }
  instance(instanceName: string) {
    return new OtelInstance({
      ...this.fields,
      'resource.attributes.service.instance.id': instanceName,
      'resource.attributes.host.name': instanceName,
    });
  }
}

export function service({ name, namespace, sdkName, sdkLanguage, distro }: ServiceParams): Service {
  return new Service({ name, namespace, sdkName, sdkLanguage, distro });
}
