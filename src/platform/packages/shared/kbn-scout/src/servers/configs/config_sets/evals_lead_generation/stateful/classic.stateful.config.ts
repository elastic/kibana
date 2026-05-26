/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as evalsEntityAnalyticsV2Config } from '../../evals_entity_analytics_v2/stateful/classic.stateful.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Custom Scout stateful server configuration for Lead Generation evals.
 *
 * Extends the Entity Analytics V2 config (which enables Entity Store V2,
 * tracing, and EIS connectors) and additionally enables the
 * `leadGenerationEnabled` experimental feature flag so that lead generation
 * routes and the task-manager task are registered.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_lead_generation
 *
 * Note: Requires Entity Store V2 to be initialised with entities before running
 * meaningful quality evaluations. For smoke tests an empty entity store is fine.
 * To seed entities use the security-documents-generator:
 *   yarn start organization-quick && yarn start generate-entity-maintainers-data --quick
 */
export const servers: ScoutServerConfig = {
  ...evalsEntityAnalyticsV2Config,
  kbnTestServer: {
    ...evalsEntityAnalyticsV2Config.kbnTestServer,
    serverArgs: [
      ...evalsEntityAnalyticsV2Config.kbnTestServer.serverArgs,
      `--xpack.securitySolution.enableExperimental=["entityAnalyticsEntityStoreV2","leadGenerationEnabled"]`,
    ],
  },
};
