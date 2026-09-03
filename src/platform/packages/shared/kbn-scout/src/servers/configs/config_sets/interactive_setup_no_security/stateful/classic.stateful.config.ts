/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { createPrebootConfig } from '../../interactive_setup.preboot_base';

/**
 * Interactive setup against an Elasticsearch with security disabled entirely.
 *
 * Serves `test/scout_interactive_setup_no_security/ui`. With no security, the setup UI asks only
 * for an address — no credentials, no certificate — and warns that the cluster is not secure.
 *
 * Every `xpack.security.*` Elasticsearch arg has to go, not just be overridden: Elasticsearch
 * rejects realm and TLS settings for a feature it is not running. That also means the stateful
 * `roles.yml` is dropped, since file-based roles are meaningless without security. On the Kibana
 * side, `withoutKibanaSecurity` drops the mock-IdP SAML provider (which would reference a realm
 * that no longer exists) and falls back to basic auth.
 *
 * Note that Kibana reports security as unavailable either way, so basic auth is not actually
 * usable — that is expected and matches the FTR suite this replaced. No interactive-setup test
 * ever logs in; the flow only needs Kibana to boot cleanly and leave the setup page.
 */
export const servers: ScoutServerConfig = createPrebootConfig({
  esFiles: [],
  withoutKibanaSecurity: true,
  esServerArgs: [
    ...defaultConfig.esTestCluster.serverArgs.filter((arg) => !arg.startsWith('xpack.security.')),
    'xpack.security.enabled=false',
  ],
});
