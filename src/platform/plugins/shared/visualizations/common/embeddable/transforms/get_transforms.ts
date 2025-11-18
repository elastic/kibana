/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { getTransformIn } from './get_transform_in';
import { getTransformOut } from './get_transform_out';

export function getTransforms(
  transformEnhancementsIn: EnhancementsRegistry['transformIn'],
  transformEnhancementsOut: EnhancementsRegistry['transformOut']
) {
  return {
    transformOutInjectsReferences: true,
    transformIn: getTransformIn(transformEnhancementsIn),
    transformOut: getTransformOut(transformEnhancementsOut),
  };
}
