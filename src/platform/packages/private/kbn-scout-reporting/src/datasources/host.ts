/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import os from 'node:os';

/**
 * Host info
 */
export interface HostMetadata {
  architecture: string;
  hostname: string;
  os: OSMetadata;
}

/**
 * Operating system info
 */
export interface OSMetadata {
  platform: string;
  version: string;
  family: string;
}

/**
 * Information about the host this process is running on
 */
export const host: HostMetadata = {
  architecture: os.arch(),
  hostname: os.hostname(),
  os: {
    platform: os.platform(),
    version: os.release(),
    family: os.type(),
  },
};
