/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { createNoTlsServers } from '../../interactive_setup.preboot_base';

/**
 * Serves `test/scout_interactive_setup_no_tls_ui/ui` — the manual-configuration wizard flow without TLS.
 *
 * Deliberately a dedicated config set for a single Playwright config: see "Why there is one config
 * set per Playwright config" in `interactive_setup.preboot_base.ts`.
 */
export const servers: ScoutServerConfig = createNoTlsServers();
