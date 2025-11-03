/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Entity } from '../../entity';
import type { ApmOtelFields } from './apm_otel_fields';
import { OtelInstance } from './otel_instance';

export interface OtelServiceParams {
  name: string;
  namespace?: string;
  sdkName: 'opentelemetry' | 'otlp';
  sdkLanguage: string;
  distro?: 'elastic';
}
export class OtelService extends Entity<ApmOtelFields> {
  constructor(params: OtelServiceParams) {
    const { name, namespace, sdkName, sdkLanguage, distro } = params;

    const fields: ApmOtelFields = {
      'resource.attributes.service.name': name,
      'resource.attributes.service.namespace': namespace,
      'resource.attributes.telemetry.sdk.name': sdkName,
      'resource.attributes.telemetry.sdk.language': sdkLanguage,
      'resource.attributes.telemetry.distro.name': distro,
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
