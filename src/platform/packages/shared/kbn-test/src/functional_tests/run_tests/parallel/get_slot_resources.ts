/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ServerCapabilities {
  servers: {
    elasticsearch: {
      from: 'serverless' | 'snapshot';
      ccs?: unknown;
    };
  };
  dockerServers?: {
    [x: string]: {
      enabled: boolean;
    };
  };
  browser?: {
    type: 'chrome' | 'firefox' | 'msedge';
  };
  esTestCluster: {
    esJavaOpts?: string;
  };
  kbnTestServer: {
    startRemoteKibana?: boolean;
    useDedicatedTaskRunner?: boolean;
  };
}

export interface SlotResources {
  warming: {
    cpu: number;
    memory: number;
    exclusive: boolean;
  };
  idle: {
    cpu: number;
    memory: number;
  };
  running: {
    cpu: number;
    memory: number;
    exclusive: boolean;
  };
}

// parse e.g. '-Xms8g -Xmx8g' or '-Xms1536m -Xmx1536m'
function getMemFromJavaOpts(javaOpts: string): number | undefined {
  if (!javaOpts) {
    return undefined;
  }

  const matches = javaOpts.match(/-Xmx(\d+)([gGmM])/);
  if (!matches) {
    return undefined;
  }

  const [, value, unit] = matches;
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  if (unit.toLowerCase() === 'g') {
    return numericValue * 1024;
  }

  if (unit.toLowerCase() === 'm') {
    return numericValue;
  }

  return undefined;
}

export function getSlotResources(capabilities: ServerCapabilities): SlotResources {
  const isServerless = capabilities.servers.elasticsearch.from === 'serverless';
  const hasCcs = !!capabilities.servers.elasticsearch.ccs;

  const numNodes = isServerless ? 3 : hasCcs ? 2 : 1;

  const esMemory =
    (capabilities.esTestCluster.esJavaOpts &&
      getMemFromJavaOpts(capabilities.esTestCluster.esJavaOpts)) ||
    1.5 * 1024;

  const numContainers = Object.entries(capabilities.dockerServers ?? {}).filter(
    ([name, config]) => config.enabled
  ).length;

  const containerMemory = numContainers * 0.75 * 1024;

  const hasBrowser = !!capabilities.browser;

  const browserMemory = hasBrowser ? 1.2 * 1024 : 0;

  const kibanaNodes =
    1 +
    (capabilities.kbnTestServer.startRemoteKibana ? 1 : 0) +
    (capabilities.kbnTestServer.useDedicatedTaskRunner ? 1 : 0);

  const kibanaMemory = kibanaNodes * 768;

  return {
    idle: {
      cpu: numNodes * 0.5,
      memory: esMemory + kibanaMemory,
    },
    warming: {
      cpu: numNodes,
      memory: esMemory,
      exclusive: !isServerless,
    },
    running: {
      cpu: hasBrowser ? 2 : 1,
      memory: esMemory + kibanaMemory + containerMemory + browserMemory,
      exclusive: hasBrowser,
    },
  };
}
