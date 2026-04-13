/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ArtifactLicense, ServerlessProjectType } from '@kbn/es';
import { isServerlessProjectType, runLinkedServerlessCluster } from '@kbn/es/src/utils';
import { MOCK_IDP_UIAM_PROJECT_ID2 } from '@kbn/mock-idp-utils';
import { REPO_ROOT } from '@kbn/repo-info';
import { cleanupElasticsearch, createTestEsCluster, esTestConfig } from '@kbn/test-es-server';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolve } from 'path';
import Url from 'url';
import type { Config } from './configs';

interface RunElasticsearchOptions {
  log: ToolingLog;
  esFrom?: string;
  esServerlessImage?: string;
  config: Config;
  onEarlyExit?: (msg: string) => void;
  logsDir?: string;
  name?: string;
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

  const password: string | undefined = isSecurityEnabled
    ? 'changeme'
    : config.get('servers.elasticsearch.password');

  const dataArchive: string | undefined = config.get('esTestCluster.dataArchive');
  const serverless: boolean = config.get('serverless');
  const files: string[] | undefined = config.get('esTestCluster.files');
  const secureFiles: string[] | undefined = config.get('esTestCluster.secureFiles');

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
    serverless,
    files,
    secureFiles,
  };
}

export async function runElasticsearch(
  options: RunElasticsearchOptions
): Promise<() => Promise<void>> {
  const { log, logsDir, name } = options;
  const config = getEsConfig(options);

  const node = await startEsNode({
    log,
    name: name ?? 'scout',
    logsDir,
    config,
  });

  // Start linked cluster for Cross Project Search after origin is ready
  if (config.esServerlessOptions?.linkedProject) {
    const serverlessOptions = {
      basePath: resolve(REPO_ROOT, '.es'),
      esArgs: config.esArgs,
      dataPath: `stateless-cluster-${name ?? 'scout'}`,
      ...config.esServerlessOptions,
      port: config.port,
      clean: true,
      background: true,
      files: config.files,
      ssl: config.ssl,
      kill: false,
      waitForReady: true,
    };

    await runLinkedServerlessCluster(log, serverlessOptions);
  }

  return async () => {
    await cleanupElasticsearch(node, config.serverless, logsDir, log);
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
    secureFiles: config.secureFiles,
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
  linkedProject?: { projectId: string; port: number };
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

  const projectType = kbnServerArgs
    .filter((arg) => arg.startsWith('--serverless'))
    .reduce((acc, arg) => {
      const match = arg.match(/--serverless[=\s](\w+)/);
      return acc + (match ? match[1] : '');
    }, '') as ServerlessProjectType;

  if (!isServerlessProjectType(projectType)) {
    throw new Error(`Unsupported serverless projectType: ${projectType}`);
  }

  const cps: boolean = config.get('esServerlessOptions.cps', false);

  const commonOptions = {
    projectType,
    host: serverlessHost,
    resources: serverlessResources,
    uiam: config.get('esServerlessOptions.uiam', false),
    uiamOAuth: config.get('esServerlessOptions.uiamOAuth', false),
    kibanaUrl: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
    ...(cps && config.get('servers.linkedElasticsearch.port')
      ? {
          linkedProject: {
            projectId: MOCK_IDP_UIAM_PROJECT_ID2,
            port: config.get('servers.linkedElasticsearch.port') as number,
          },
        }
      : {}),
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
