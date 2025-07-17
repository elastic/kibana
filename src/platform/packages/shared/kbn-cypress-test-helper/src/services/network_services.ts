/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getLocalhostRealIp = (): string => {
  // Use require dynamically so Cypress don't process it
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const os = require('os') as typeof import('os');
  const interfaces = os.networkInterfaces();

  for (const netInterfaceList of Object.values(interfaces).reverse()) {
    if (netInterfaceList) {
      const netInterface = netInterfaceList.find(
        (networkInterface) =>
          networkInterface.family === 'IPv4' &&
          !networkInterface.internal &&
          networkInterface.address
      );
      if (netInterface) {
        return netInterface.address;
      }
    }
  }

  return '0.0.0.0';
};
