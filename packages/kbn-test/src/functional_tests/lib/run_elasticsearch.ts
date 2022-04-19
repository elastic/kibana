/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import type { ToolingLog } from '@kbn/dev-utils';
import getPort from 'get-port';
import { KIBANA_ROOT } from './paths';
import type { Config } from '../../functional_test_runner';
import { createTestEsCluster } from '../../es';

interface RunElasticsearchOptions {
  log: ToolingLog;
  esFrom?: string;
  config: Config;
}

interface CcsConfig {
  remoteClusterUrl: string;
}

type EsConfig = ReturnType<typeof getEsConfig>;

function getEsConfig({
  config,
  esFrom = config.get('esTestCluster.from'),
}: RunElasticsearchOptions) {
  const ssl = !!config.get('esTestCluster.ssl');
  const license: 'basic' | 'trial' | 'gold' = config.get('esTestCluster.license');
  const esArgs: string[] = config.get('esTestCluster.serverArgs') ?? [];
  const esJavaOpts: string | undefined = config.get('esTestCluster.esJavaOpts');
  const isSecurityEnabled = esArgs.includes('xpack.security.enabled=true');

  const port: number | undefined = config.get('servers.elasticsearch.port');
  const ccsConfig: CcsConfig | undefined = config.get('esTestCluster.ccs');

  const password: string | undefined = isSecurityEnabled
    ? 'changeme'
    : config.get('servers.elasticsearch.password');

  const dataArchive: string | undefined = config.get('esTestCluster.dataArchive');

  return {
    ssl,
    license,
    esArgs,
    esJavaOpts,
    isSecurityEnabled,
    esFrom,
    port,
    password,
    dataArchive,
    ccsConfig,
  };
}

export async function runElasticsearch(
  options: RunElasticsearchOptions
): Promise<() => Promise<void>> {
  const { log } = options;
  const config = getEsConfig(options);

  if (!config.ccsConfig) {
    const node = await startEsNode(log, 'ftr', config);
    return async () => {
      await node.cleanup();
    };
  }

  const remotePort = await getPort();
  const remoteNode = await startEsNode(log, 'ftr-remote', {
    ...config,
    port: parseInt(new URL(config.ccsConfig.remoteClusterUrl).port, 10),
    transportPort: remotePort,
  });

  const localNode = await startEsNode(log, 'ftr-local', {
    ...config,
    esArgs: [...config.esArgs, `cluster.remote.ftr-remote.seeds=localhost:${remotePort}`],
  });

  return async () => {
    await localNode.cleanup();
    await remoteNode.cleanup();
  };
}

async function startEsNode(
  log: ToolingLog,
  name: string,
  config: EsConfig & { transportPort?: number }
) {
  const cluster = createTestEsCluster({
    clusterName: `cluster-${name}`,
    esArgs: config.esArgs,
    esFrom: config.esFrom,
    esJavaOpts: config.esJavaOpts,
    license: config.license,
    password: config.password,
    port: config.port,
    ssl: config.ssl,
    log,
    basePath: resolve(KIBANA_ROOT, '.es'),
    nodes: [
      {
        name,
        dataArchive: config.dataArchive,
      },
    ],
    transportPort: config.transportPort,
  });

  await cluster.start();

  return cluster;
}
