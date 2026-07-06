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
 * Custom server config set for SharedUX-owned plugins that need a clean ES/Kibana state
 * (no data views, no user data). Runs in its own Scout lane/server so "no data" suites
 * don't get polluted by data loaded in the default lane.
 *
 * Used by:
 *  - src/platform/plugins/shared/home/test/scout_shared_ux_no_data/
 *  - src/platform/plugins/private/kibana_overview/test/scout_shared_ux_no_data/
 */
export const servers: ScoutServerConfig = defaultConfig;
