/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as uiamConfig } from '../../uiam_local/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

export const servers: ScoutServerConfig = {
  ...uiamConfig,
  esServerlessOptions: {
    uiam: true,
    csp: true,
  },
};
