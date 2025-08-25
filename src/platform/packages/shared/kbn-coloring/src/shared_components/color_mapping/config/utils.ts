/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_OTHER_ASSIGNMENT_INDEX } from './default_color_mapping';
import type {
  Config,
  CategoricalConfig,
  GradientConfig,
  CategoricalColor,
  ColorCode,
} from './types';

export function isCategoricalColorConfig(config: Config): config is CategoricalConfig {
  return config.colorMode.type === 'categorical';
}

export function isGradientColorConfig(config: Config): config is GradientConfig {
  return config.colorMode.type === 'gradient';
}

export function getOtherAssignmentColor(
  specialAssignments: Config['specialAssignments'],
  assignments: Config['assignments']
):
  | {
      isLoop: true;
    }
  | {
      isLoop: false;
      color: CategoricalColor | ColorCode;
    } {
  if (
    // prevents misconfigured color mapping from having a no assignment and a different other color.
    // loop is default and only configuration with no assignments.
    assignments.length === 0 ||
    // TODO: the specialAssignment[0] position is arbitrary, we should fix it better
    specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color.type === 'loop'
  ) {
    return { isLoop: true };
  } else {
    return { isLoop: false, color: specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color };
  }
}
