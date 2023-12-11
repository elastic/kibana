/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceAsset } from '../assets';
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

  asset() {
    return new ServiceAsset({
      'asset.kind': 'service',
      'asset.id': this.fields['service.name']!,
      'asset.name': this.fields['service.name'],
      'asset.ean': `service:${this.fields['service.name']}`,
    });
  }
}

export function service(name: string, environment: string, agentName: string): Service;

export function service(options: { name: string; environment: string; agentName: string }): Service;

export function service(
  ...args: [{ name: string; environment: string; agentName: string }] | [string, string, string]
) {
  const [serviceName, environment, agentName] =
    args.length === 1 ? [args[0].name, args[0].environment, args[0].agentName] : args;

  return new Service({
    'service.name': serviceName,
    'service.environment': environment,
    'agent.name': agentName,
  });
}
