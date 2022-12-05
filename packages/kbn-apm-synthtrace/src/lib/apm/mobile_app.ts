/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Entity } from '../entity';
import { ApmFields } from './apm_fields';
import { MobileDevice } from './mobile_device';
import { generateLongId } from '../utils/generate_id';

export class MobileApp extends Entity<ApmFields> {
  mobileDevice(deviceId?: string) {
    return new MobileDevice({
      ...this.fields,
      'device.id': deviceId ? deviceId : generateLongId(),
      'service.language.name': this.fields['agent.name'] === 'iOS' ? 'swift' : 'java',
    }).startNewSession();
  }
}

export function mobileApp(
  name: string,
  environment: string,
  agentName: 'iOS' | 'android'
): MobileApp;

export function mobileApp(options: {
  name: string;
  environment: string;
  agentName: 'iOS' | 'android';
}): MobileApp;

export function mobileApp(
  ...args:
    | [{ name: string; environment: string; agentName: 'iOS' | 'android' }]
    | [string, string, 'iOS' | 'android']
) {
  const [serviceName, environment, agentName] =
    args.length === 1 ? [args[0].name, args[0].environment, args[0].agentName] : args;

  return new MobileApp({
    'service.name': serviceName,
    'service.environment': environment,
    'agent.name': agentName,
  });
}
