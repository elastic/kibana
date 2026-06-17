/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { publicApiAccessStepCommonDefinition } from '../../common/steps/public_api_access_step';

export const publicApiAccessStepDefinition = createPublicStepDefinition({
  ...publicApiAccessStepCommonDefinition,
});
