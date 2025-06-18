/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { networkInterfaces } from 'node:os';

export const getLocalhostRealIp = (): string => {
  // reverse to get the last interface first
  for (const netInterfaceList of Object.values(networkInterfaces()).reverse()) {
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
