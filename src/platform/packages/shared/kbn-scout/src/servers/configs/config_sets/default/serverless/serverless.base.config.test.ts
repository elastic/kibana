/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_CERT_PATH, KBN_KEY_PATH, KBN_SERVERLESS_UIAM_CERTS } from '@kbn/dev-utils';
import { defaultConfig } from './serverless.base.config';
import { servers as observabilityComplete } from './observability_complete.serverless.config';
import { servers as observabilityLogsEssentials } from './observability_logs_essentials.serverless.config';

const uiamSslArgs = (serverArgs: string[]) =>
  serverArgs.filter(
    (arg) =>
      arg.startsWith('--xpack.security.uiam.ssl.certificate=') ||
      arg.startsWith('--xpack.security.uiam.ssl.key=')
  );

describe('Serverless UIAM client certificate', () => {
  it('presents the search certificate in the base config', () => {
    expect(uiamSslArgs(defaultConfig.kbnTestServer.serverArgs)).toEqual([
      `--xpack.security.uiam.ssl.certificate=${KBN_CERT_PATH}`,
      `--xpack.security.uiam.ssl.key=${KBN_KEY_PATH}`,
    ]);
  });

  it.each([
    ['observability complete', observabilityComplete],
    ['observability logs essentials', observabilityLogsEssentials],
  ])('presents only the observability certificate for %s', (_, servers) => {
    expect(uiamSslArgs(servers.kbnTestServer.serverArgs)).toEqual([
      `--xpack.security.uiam.ssl.certificate=${KBN_SERVERLESS_UIAM_CERTS.observability.certPath}`,
      `--xpack.security.uiam.ssl.key=${KBN_SERVERLESS_UIAM_CERTS.observability.keyPath}`,
    ]);
  });
});
