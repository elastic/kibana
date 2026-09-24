/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { withEvalsTracing } from '../shared';

const gcsCredentials = process.env.GCS_CREDENTIALS;
let gcsSecureFile: string | undefined;

if (gcsCredentials) {
  const gcsCredentialsFilePath = join(
    tmpdir(),
    `gcs-credentials-${Date.now()}-${process.pid}.json`
  );
  writeFileSync(gcsCredentialsFilePath, gcsCredentials);
  gcsSecureFile = `gcs.client.default.credentials_file=${gcsCredentialsFilePath}`;
  process.on('exit', () => {
    try {
      unlinkSync(gcsCredentialsFilePath);
    } catch {
      // Ignore errors if file was already deleted
    }
  });
}

const tracingConfig = withEvalsTracing(defaultConfig);

/**
 * Custom Scout stateful server configuration that enables OTLP trace exporting
 * from Kibana to a local OpenTelemetry collector (e.g. `node scripts/edot_collector.js`).
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_tracing
 */
export const servers: ScoutServerConfig = {
  ...tracingConfig,
  esTestCluster: {
    ...tracingConfig.esTestCluster,
    secureFiles: [...(gcsSecureFile ? [gcsSecureFile] : [])],
  },
};
