/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { networkInterfaces } from 'node:os';

export const getLocalhostRealIp = (): string => {
  for (const netInterfaceList of Object.values(networkInterfaces())) {
    if (netInterfaceList) {
      const netInterface = netInterfaceList.find(
        (networkInterface) =>
          networkInterface.family === 'IPv4' &&
          networkInterface.internal === false &&
          networkInterface.address
      );
      if (netInterface) {
        return netInterface.address;
      }
    }
  }
  return '0.0.0.0';
};
