/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';

import { CA_CERT_PATH } from '@kbn/dev-utils';

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import {
  createPrebootConfig,
  ES_HTTP_KEYSTORE_PASSWORD,
  ES_HTTP_KEYSTORE_PATH,
} from '../../interactive_setup.preboot_base';

/**
 * Interactive setup against a TLS-enabled, security-enabled Elasticsearch.
 *
 * Serves both interactive-setup flows that need TLS, via namespaced Scout roots:
 * - `test/scout_interactive_setup_tls/enrollment/{api,ui}` — enrollment-token flow
 * - `test/scout_interactive_setup_tls/manual/{api,ui}` — manual-configuration flow
 *
 * The enrollment requirements are a strict superset of the manual-configuration ones, and both
 * extras are inert for the manual flow, so one config set covers both:
 * - `xpack.security.enrollment.enabled` only affects the `_security/enroll_*` APIs, which the
 *   manual `configure` flow never calls.
 * - The explicit HTTP keystore wins over the one `ssl: true` would otherwise inject: `@kbn/es`
 *   only adds its default keystore when `xpack.security.http.ssl.keystore.path` is unset.
 *
 * Tests read the CA off the live TLS chain at runtime rather than assuming a particular
 * certificate, and the keystore's chain roots at the same `@kbn/dev-utils` CA below.
 */
export const servers: ScoutServerConfig = createPrebootConfig({
  esProtocol: 'https',
  esSsl: true,
  esCertificateAuthorities: [readFileSync(CA_CERT_PATH)],
  esServerArgs: [
    ...defaultConfig.esTestCluster.serverArgs,
    'xpack.security.enabled=true',
    'xpack.security.enrollment.enabled=true',
    `xpack.security.http.ssl.keystore.path=${ES_HTTP_KEYSTORE_PATH}`,
    `xpack.security.http.ssl.keystore.secure_password=${ES_HTTP_KEYSTORE_PASSWORD}`,
  ],
});
