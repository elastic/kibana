/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ProjectsData } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
export declare const CACHE_TTL_MS = 15000;
export interface ProjectFetcher {
  fetchProjects: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
}
export declare function createProjectFetcher(http: HttpSetup, logger: Logger): ProjectFetcher;
