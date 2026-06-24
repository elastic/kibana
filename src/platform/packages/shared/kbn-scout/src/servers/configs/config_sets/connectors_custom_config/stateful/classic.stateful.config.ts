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

/**
 * Server config for triggers_actions_ui connector tests that need non-default
 * `xpack.actions.*` settings. Consolidates three former custom-config FTR suites
 * (email services enabled list, AWS SES host/port override, webhook PFX disabled)
 * into a single Kibana boot — the three settings are independent and do not conflict.
 *
 * The literal values below are mirrored by the specs that assert them; keep them in
 * sync with the constants in
 * `x-pack/platform/plugins/shared/triggers_actions_ui/test/scout_connectors_custom_config/ui/fixtures/constants.ts`.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--xpack.actions.email.services.enabled=${JSON.stringify(['google-mail', 'amazon-ses'])}`,
      `--xpack.actions.email.services.ses.host=email-fips.ca-central-1.amazonaws.com`,
      `--xpack.actions.email.services.ses.port=25439`,
      `--xpack.actions.webhook.ssl.pfx.enabled=false`,
    ],
  },
};
