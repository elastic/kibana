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
 * Interactive setup against a security-enabled Elasticsearch served over plain HTTP.
 *
 * Serves `test/scout_interactive_setup_no_tls/{api,ui}`. Because there is no TLS, the setup UI
 * offers no certificate-authority step and the `configure` API takes no `caCert`.
 */
export const servers: ScoutServerConfig = createPrebootConfig({
  esServerArgs: [...defaultConfig.esTestCluster.serverArgs, 'xpack.security.enabled=true'],
});
