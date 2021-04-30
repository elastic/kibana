/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import type { ToolingLog } from '@kbn/dev-utils';
import { KIBANA_ROOT } from './paths';
import type { Config } from '../../functional_test_runner/';
import { createTestEsCluster } from '../../es';

import { setupUsers, DEFAULT_SUPERUSER_PASS } from './auth';

interface RunElasticsearchOptions {
  log: ToolingLog;
  esFrom: string;
}
export async function runElasticsearch({
  config,
  options,
}: {
  config: Config;
  options: RunElasticsearchOptions;
}) {
  const { log, esFrom } = options;
  const ssl = config.get('esTestCluster.ssl');
  const license = config.get('esTestCluster.license');
  const esArgs = config.get('esTestCluster.serverArgs');
  const esEnvVars = config.get('esTestCluster.serverEnvVars');
  const isSecurityEnabled = esArgs.includes('xpack.security.enabled=true');

  const cluster = createTestEsCluster({
    port: config.get('servers.elasticsearch.port'),
    password: isSecurityEnabled
      ? DEFAULT_SUPERUSER_PASS
      : config.get('servers.elasticsearch.password'),
    license,
    log,
    basePath: resolve(KIBANA_ROOT, '.es'),
    esFrom: esFrom || config.get('esTestCluster.from'),
    dataArchive: config.get('esTestCluster.dataArchive'),
    esArgs,
    esEnvVars,
    ssl,
  });

  await cluster.start();

  if (isSecurityEnabled) {
    await setupUsers({
      log,
      esPort: config.get('servers.elasticsearch.port'),
      updates: [config.get('servers.elasticsearch'), config.get('servers.kibana')],
      protocol: config.get('servers.elasticsearch').protocol,
      caPath: getRelativeCertificateAuthorityPath(config.get('kbnTestServer.serverArgs')),
    });
  }

  return cluster;
}

function getRelativeCertificateAuthorityPath(esConfig: string[] = []) {
  const caConfig = esConfig.find(
    (config) => config.indexOf('--elasticsearch.ssl.certificateAuthorities') === 0
  );
  return caConfig ? caConfig.split('=')[1] : undefined;
}
