/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { networkInterfaces } from 'os';

/**
 * Advertise addresses a Fleet Server container and an Endpoint VM can reach.
 * `localhost` is not routable from Docker or Vagrant/Multipass.
 *
 * Inlined (do not import from `@kbn/security-solution-plugin`) — kbn-scout is
 * a platform package and cannot depend on a solutions plugin. Same algorithm
 * as `scripts/endpoint/common/network_services.ts`.
 */
export const getEdrRealFleetHostIp = (): string => {
  if (process.env.KIBANA_LOCALHOST_REAL_IP) {
    return process.env.KIBANA_LOCALHOST_REAL_IP;
  }

  for (const netInterfaceList of Object.values(networkInterfaces()).reverse()) {
    if (netInterfaceList) {
      const netInterface = netInterfaceList.find(
        (networkInterface) =>
          networkInterface.family === 'IPv4' &&
          networkInterface.internal === false &&
          networkInterface.address &&
          !networkInterface.address.endsWith('.0')
      );
      if (netInterface) {
        return netInterface.address;
      }
    }
  }

  return '0.0.0.0';
};

export const EDR_REAL_FLEET_SERVER_PORT = 8220;
export const EDR_REAL_FLEET_ES_PORT = 9220;
