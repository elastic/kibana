/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/** In-memory events-on connectors for the Kibana API key and service-account bearer doors. */
export const inboundHubServerArgs = [
  '--xpack.actions.inboundEvents.enabled=true',
  `--plugin-path=${resolve(
    REPO_ROOT,
    'x-pack/platform/test/workflows_inbound_hub/plugins/inbound_hub_connector'
  )}`,
];
