/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server } from 'http';
import type { UrlParts } from '@kbn/test';

/**
 * Configuration for auxiliary servers that start alongside ES/Kibana.
 * Examples: Mock APIs, proxy servers, test fixture servers, etc.
 */
export interface AuxiliaryServerConfig {
  /** Unique name for the server (used in logs and process management) */
  name: string;

  /** Port number to listen on */
  port: number;

  /**
   * Function that creates, starts, and returns a Node.js HTTP server instance.
   * All startup logic and error handling is implemented here.
   * Implementation lives in plugin code, referenced in Scout config.
   */
  startServer: (log: import('@kbn/tooling-log').ToolingLog) => Promise<Server>;

  /** Optional: HTTP path to check for readiness (e.g., '/health') */
  readyPath?: string;

  /** Optional: Timeout in ms to wait for server to start (default: 10000) */
  startTimeout?: number;
}

export interface ScoutServerConfig {
  serverless?: boolean;
  servers: {
    kibana: UrlParts;
    elasticsearch: UrlParts;
    fleet?: UrlParts;
  };
  dockerServers: any;
  esTestCluster: {
    from: string;
    license?: string;
    files: string[];
    serverArgs: string[];
    ssl: boolean;
  };
  esServerlessOptions?: { uiam: boolean };
  kbnTestServer: {
    env: any;
    buildArgs: string[];
    sourceArgs: string[];
    serverArgs: string[];
    useDedicatedTestRunner?: boolean;
  };
  /**
   * Optional auxiliary servers to start after Kibana.
   * Defined in custom configs, implementation lives in plugin code.
   */
  auxiliaryServers?: AuxiliaryServerConfig[];
}
