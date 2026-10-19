/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const CLUSTER_STATE_ENCRYPTION_PASSWORD_ID = 'data_fed_test';

const scoutSecureSettingsDir = resolve(REPO_ROOT, '.scout', 'secure_settings');
mkdirSync(scoutSecureSettingsDir, { recursive: true });

const clusterStateEncryptionActivePasswordIdFile = resolve(
  scoutSecureSettingsDir,
  'cluster_state_encryption_active_password_id'
);
const clusterStateEncryptionPasswordFile = resolve(
  scoutSecureSettingsDir,
  `cluster_state_encryption_password_${CLUSTER_STATE_ENCRYPTION_PASSWORD_ID}`
);

// These are test-only values used to enable ES cluster state encryption for
// features (like data federation sources) that store encrypted values in
// the cluster state. The config is loaded eagerly, so write files here.
writeFileSync(clusterStateEncryptionActivePasswordIdFile, CLUSTER_STATE_ENCRYPTION_PASSWORD_ID, {
  encoding: 'utf8',
});
writeFileSync(
  clusterStateEncryptionPasswordFile,
  'kibana-scout-cluster-state-encryption-password',
  { encoding: 'utf8' }
);

export const dataFederationConfig: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    secureFiles: [
      ...(defaultConfig.esTestCluster.secureFiles ?? []),
      `cluster.state.encryption.active_password_id=${clusterStateEncryptionActivePasswordIdFile}`,
      `cluster.state.encryption.password.${CLUSTER_STATE_ENCRYPTION_PASSWORD_ID}=${clusterStateEncryptionPasswordFile}`,
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, '--xpack.dataFederation.enabled=true'],
  },
};
