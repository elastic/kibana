/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { resolve } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import getPort from 'get-port';
import getopts from 'getopts';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ArtifactLicense, ServerlessProjectType } from '@kbn/es';
import { isServerlessProjectType, extractAndArchiveLogs } from '@kbn/es/src/utils';
import type { Config } from '../../functional_test_runner';
import { ICluster, createTestEsCluster, esTestConfig } from '../../es';

interface RunElasticsearchOptions {
  log: ToolingLog;
  esFrom?: string;
  esServerlessImage?: string;
  config: Config;
  onEarlyExit?: (msg: string) => void;
  logsDir?: string;
  name?: string;
}

interface CcsConfig {
  remoteClusterUrl: string;
}

type EsConfig = ReturnType<typeof getEsConfig>;

function getEsConfig({
  config,
  esFrom = config.get('esTestCluster.from'),
  esServerlessImage,
}: RunElasticsearchOptions) {
  const ssl = !!config.get('esTestCluster.ssl');
  const license: ArtifactLicense = config.get('esTestCluster.license');
  const esArgs: string[] = config.get('esTestCluster.serverArgs');
  const esJavaOpts: string | undefined = config.get('esTestCluster.esJavaOpts');
  const isSecurityEnabled = esArgs.includes('xpack.security.enabled=true');

  const port: number | undefined = config.get('servers.elasticsearch.port');
  const ccsConfig: CcsConfig | undefined = config.get('esTestCluster.ccs');

  const password: string | undefined = isSecurityEnabled
    ? 'changeme'
    : config.get('servers.elasticsearch.password');

  const dataArchive: string | undefined = config.get('esTestCluster.dataArchive');
  const serverless: boolean = config.get('serverless');
  const files: string[] | undefined = config.get('esTestCluster.files');

  const esServerlessOptions = serverless
    ? getESServerlessOptions(esServerlessImage, config)
    : undefined;

  return {
    ssl,
    license,
    esArgs,
    esJavaOpts,
    isSecurityEnabled,
    esFrom,
    esServerlessOptions,
    port,
    password,
    dataArchive,
    ccsConfig,
    serverless,
    files,
  };
}

export async function cleanupElasticsearch(
  node: ICluster,
  isServerless: boolean,
  logsDir: string | undefined,
  log: ToolingLog
): Promise<void> {
  await node.cleanup();

  if (isServerless) {
    await extractAndArchiveLogs({ outputFolder: logsDir, log });
  }
}

export async function runElasticsearch(
  options: RunElasticsearchOptions
): Promise<() => Promise<void>> {
  const { log, logsDir, name } = options;
  const config = getEsConfig(options);

  if (!config.ccsConfig) {
    const node = await startEsNode({
      log,
      name: name ?? 'ftr',
      logsDir,
      config,
    });
    return async () => {
      await cleanupElasticsearch(node, config.serverless, logsDir, log);
    };
  }

  const remotePort = await getPort();
  const remoteNode = await startEsNode({
    log,
    name: name ?? 'ftr-remote',
    logsDir,
    config: {
      ...config,
      port: parseInt(new URL(config.ccsConfig.remoteClusterUrl).port, 10),
      transportPort: remotePort,
    },
  });

  const localNode = await startEsNode({
    log,
    name: name ?? 'ftr-local',
    logsDir,
    config: {
      ...config,
      esArgs: [...config.esArgs, `cluster.remote.ftr-remote.seeds=localhost:${remotePort}`],
    },
  });

  return async () => {
    await localNode.cleanup();
    await remoteNode.cleanup();
    await extractAndArchiveLogs({ outputFolder: logsDir, log });
  };
}

async function startEsNode({
  log,
  name,
  config,
  onEarlyExit,
  logsDir,
}: {
  log: ToolingLog;
  name: string;
  config: EsConfig & { transportPort?: number };
  onEarlyExit?: (msg: string) => void;
  logsDir?: string;
}) {
  const cluster = createTestEsCluster({
    clusterName: `cluster-${name}`,
    esArgs: config.esArgs,
    esFrom: config.esFrom,
    esServerlessOptions: config.esServerlessOptions,
    esJavaOpts: config.esJavaOpts,
    license: config.license,
    password: config.password,
    port: config.port,
    ssl: config.ssl,
    log,
    writeLogsToPath: logsDir ? resolve(logsDir, `es-cluster-${name}.log`) : undefined,
    basePath: resolve(REPO_ROOT, '.es'),
    nodes: [
      {
        name,
        dataArchive: config.dataArchive,
      },
    ],
    transportPort: config.transportPort,
    onEarlyExit,
    serverless: config.serverless,
    files: config.files,
  });

  await cluster.start();

  return cluster;
}

interface EsServerlessOptions {
  projectType: ServerlessProjectType;
  host?: string;
  resources: string[];
  kibanaUrl: string;
  tag?: string;
  image?: string;
}

function getESServerlessOptions(
  esServerlessImageFromArg: string | undefined,
  config: Config
): EsServerlessOptions {
  const esServerlessImageUrlOrTag =
    esServerlessImageFromArg ||
    esTestConfig.getESServerlessImage() ||
    (config.has('esTestCluster.esServerlessImage') &&
      config.get('esTestCluster.esServerlessImage'));
  const serverlessResources: string[] =
    (config.has('esServerlessOptions.resources') && config.get('esServerlessOptions.resources')) ||
    [];
  const serverlessHost: string | undefined =
    config.has('esServerlessOptions.host') && config.get('esServerlessOptions.host');

  const kbnServerArgs =
    (config.has('kbnTestServer.serverArgs') &&
      (config.get('kbnTestServer.serverArgs') as string[])) ||
    [];

  const options = getopts(kbnServerArgs);
  const projectType = options.serverless as ServerlessProjectType;

  if (!isServerlessProjectType(projectType)) {
    throw new Error(`Unsupported serverless projectType: ${projectType}`);
  }

  const commonOptions = {
    projectType,
    host: serverlessHost,
    resources: serverlessResources,
    kibanaUrl: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
  };

  if (esServerlessImageUrlOrTag) {
    return {
      ...commonOptions,
      ...(esServerlessImageUrlOrTag.includes(':')
        ? { image: esServerlessImageUrlOrTag }
        : { tag: esServerlessImageUrlOrTag }),
    };
  }

  return commonOptions;
}
