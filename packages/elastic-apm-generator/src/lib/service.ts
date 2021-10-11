/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from './entity';
import { Instance } from './instance';

export class Service extends Entity {
  instance(instanceName: string) {
    return new Instance({
      ...this.fields,
      ['service.node.name']: instanceName,
    });
  }
}

export function service(name: string, environment: string, agentName: string) {
  return new Service({
    'service.name': name,
    'service.environment': environment,
    'agent.name': agentName,
  });
}
