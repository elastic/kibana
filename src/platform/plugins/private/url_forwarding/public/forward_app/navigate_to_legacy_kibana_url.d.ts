/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart, IBasePath } from '@kbn/core/public';
import type { ForwardDefinition } from '..';
export declare const navigateToLegacyKibanaUrl: (
  path: string,
  forwards: ForwardDefinition[],
  basePath: IBasePath,
  application: ApplicationStart
) => {
  navigated: boolean;
};
