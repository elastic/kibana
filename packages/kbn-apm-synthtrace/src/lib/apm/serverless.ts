/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { ApmFields } from './apm_fields';
import { Instance } from './instance';

export class Serverless extends Entity<ApmFields> {
  instance(instanceName: string) {
    return new Instance({
      ...this.fields,
      ['service.node.name']: instanceName,
      'host.name': instanceName,
    });
  }
}

export function serverless({
  serviceName,
  environment,
  agentName,
  faasId,
  coldStart,
  faasTriggerType,
}: {
  serviceName: string;
  environment: string;
  agentName: string;
  faasId: string;
  coldStart: boolean;
  faasTriggerType: string;
}) {
  return new Serverless({
    'service.name': serviceName,
    'service.environment': environment,
    'agent.name': agentName,
    'faas.id': faasId,
    'faas.coldstart': coldStart,
    'faas.trigger.type': faasTriggerType,
  });
}
