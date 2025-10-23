/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import getPort from 'get-port';
import * as defaults from './defaults';
import { FLEET_PACKAGE_REGISTRY_PORT } from './service_addresses';

async function acquire(preference?: number) {
  return (await getPort({ port: preference })).toString();
}

export async function acquirePorts() {
  const ports: Record<string, string | undefined> = {};
  for (const [key, _port] of Object.entries(defaults)) {
    const envVarName = key.replace('_DEFAULT', '');
    const acquiredPort = await acquire();
    ports[envVarName] = acquiredPort;
  }

  ports.FLEET_PACKAGE_REGISTRY_PORT = FLEET_PACKAGE_REGISTRY_PORT ? await acquire() : undefined;

  return ports;
}
