/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';

import type { LensAttributes } from '../../../types';
import { validateStateTransformsFn } from './validate_state_transforms';
import type { Canonicalizer } from './canonicalizers/types';
import { validateApiTransformsFn } from './validate_api_transforms';
import type { ValidateTransform } from './types';

export function validateTransformsFn(
  schema: Type<any>,
  canonicalizer?: Canonicalizer<LensAttributes>
): ValidateTransform {
  return {
    fromState: validateStateTransformsFn(schema, canonicalizer),
    fromApi: validateApiTransformsFn(schema),
  };
}
