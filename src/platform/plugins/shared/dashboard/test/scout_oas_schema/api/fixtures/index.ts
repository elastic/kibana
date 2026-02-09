/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';

export const apiTest = baseApiTest.extend<ScoutTestFixtures, ScoutWorkerFixtures>({});

/** The base API path for dashboard endpoints (no leading slash for apiClient). */
export const DASHBOARD_API_PATH = 'api/dashboards';
