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
 * Scout server configuration for the Ingest Hub suite.
 *
 * The suite ran on the default config set while Ingest Hub was its own plugin. It now lives in
 * `fleet/test/scout_ingest_hub`, and Scout reads the `scout_<name>` directory as a request for a
 * config set of that name, so the set has to exist. No extra server args are needed.
 */
export const servers: ScoutServerConfig = defaultConfig;
