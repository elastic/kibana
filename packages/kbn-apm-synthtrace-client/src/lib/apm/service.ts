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
  options: { name: string; environment: string; agentName: string } & Partial<ApmFields>
): Service {
  const { name, environment, agentName, ...rest } = options;

  return new Service({
    'service.name': name,
    'service.environment': environment,
    'agent.name': agentName,
    ...rest,
  });
}
