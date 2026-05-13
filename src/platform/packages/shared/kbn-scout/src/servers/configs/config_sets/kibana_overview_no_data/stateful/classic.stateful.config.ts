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
 * Custom server config set used by playwright configs located under
 * `src/platform/plugins/private/kibana_overview/test/scout_kibana_overview_no_data/...`.
 *
 * This intentionally matches the default stateful classic configuration, but runs in its own
 * Scout lane/server (fresh Kibana+ES) to support suites that require a clean ES/Kibana state.
 */
export const servers: ScoutServerConfig = defaultConfig;
