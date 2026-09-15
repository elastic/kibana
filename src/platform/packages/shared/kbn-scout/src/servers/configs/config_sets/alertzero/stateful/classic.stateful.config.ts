/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. See the Elastic License 2.0
 * or the Server Side Public License, SSPL v1, whichever you elect as your use of this file, in
 * accordance with such license terms as may be agreed between you and Elasticsearch B.V.
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Config set for the AlertZero onboarding UI suite (`test/scout_alertzero`).
 * The onboarding transaction installs managed watch workflows into the space
 * and ensures an agent for it, so the AlertZero plugin must be enabled (it
 * defaults to disabled), and the Workflows UI + agent settings the workers
 * rely on must be on — the same flags the detection-watch-rule-creation eval
 * suite needs for the workflows the plugin installs at start.
 *
 * Scout selects this set because the Playwright config lives under
 * `test/scout_alertzero/`.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      // AlertZero requires agenticInvestigations (requiredPlugins in kibana.jsonc);
      // it defaults to disabled, which transitively disables alertzero even when
      // alertzero itself is enabled.
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
    ],
  },
};
