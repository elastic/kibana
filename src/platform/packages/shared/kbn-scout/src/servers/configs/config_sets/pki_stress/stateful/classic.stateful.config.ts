/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { pkiConfig } from '../../pki/stateful/base.config';

// PKI stress/regression suites (test/scout_pki_stress) drive test-only routes — currently the
// pre-auth holds used to park a request inside PKI authenticate — that are exposed by the security
// functional-test plugin, so it has to be loaded at startup.
//
// This lives here rather than in the shared `pki` config set so the PKI login specs
// (test/scout_pki/ui) don't boot a plugin they never call. That matters beyond boot cost: those
// specs authenticate via PKI, and this plugin patches `PKIAuthenticationProvider.authenticate`,
// so keeping it out means they exercise an unmodified auth provider.
const pluginPath = `--plugin-path=${resolve(
  REPO_ROOT,
  'x-pack/platform/test/security_functional/plugins/test_endpoints'
)}`;

export const servers: ScoutServerConfig = {
  ...pkiConfig,
  // Matches the `pki` set. Required by the HTTP/2 stream-cancel spec, which needs RST_STREAM.
  http2: true,
  kbnTestServer: {
    ...pkiConfig.kbnTestServer,
    serverArgs: [...pkiConfig.kbnTestServer.serverArgs, pluginPath],
  },
};
