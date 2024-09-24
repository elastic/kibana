/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import type { ProjectType } from '@kbn/serverless-types';

export const icons: Record<ProjectType, IconType> = {
  observability: 'logoObservability',
  security: 'logoSecurity',
  search: 'logoEnterpriseSearch',
} as const;

export const labels: Record<ProjectType, string> = {
  observability: 'Observability',
  security: 'Security',
  search: 'Enterprise Search',
} as const;

export const projectTypes: ProjectType[] = ['security', 'observability', 'search'];
