/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraPool } from '../types';

export const HOST: Record<'linux', InfraPool<'resource_pressure'>> = {
  linux: {
    healthy: [
      `systemd[1]: Started {app_snake}.service.`,
      `kernel: [UFW ALLOW] IN=eth0 SRC={db_host} PROTO=TCP DPT=8080`,
    ],
    resource_pressure: {
      warn: [
        `kernel: [123456.789] cgroup: {app_snake}(pid={conn_id}): memory usage nearing limit, usage=240M of 256M`,
        `systemd[1]: {app_snake}.service: Memory pressure warning, cgroup high threshold reached`,
      ],
      error: [],
    },
  },
};
