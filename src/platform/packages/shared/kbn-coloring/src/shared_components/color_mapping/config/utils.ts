/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Config,
  CategoricalConfig,
  GradientConfig,
  CategoricalColor,
  ColorCode,
  OtherAssignment,
  OtherBucketAssignment,
} from './types';

export function isCategoricalColorConfig(config: Config): config is CategoricalConfig {
  return config.colorMode.type === 'categorical';
}

export function isGradientColorConfig(config: Config): config is GradientConfig {
  return config.colorMode.type === 'gradient';
}

export function isOtherAssignment(
  assignment: OtherAssignment | OtherBucketAssignment
): assignment is OtherAssignment {
  return assignment.rules.length === 1 && assignment.rules[0].type === 'other';
}

export function isOtherBucketAssignment(
  assignment: OtherAssignment | OtherBucketAssignment
): assignment is OtherBucketAssignment {
  return assignment.rules.length === 1 && assignment.rules[0].type === 'others_bucket';
}

export function getOtherAssignment(specialAssignments: Config['specialAssignments']) {
  for (const [index, assignment] of specialAssignments.entries()) {
    if (isOtherAssignment(assignment)) {
      return { assignment, index };
    }
  }
  return undefined;
}

export function getOtherBucketAssignment(specialAssignments: Config['specialAssignments']) {
  for (const [index, assignment] of specialAssignments.entries()) {
    if (isOtherBucketAssignment(assignment)) {
      return { assignment, index };
    }
  }
  return undefined;
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
  const otherAssignment = getOtherAssignment(specialAssignments)?.assignment;

  if (
    // prevents misconfigured color mapping from having a no assignment and a different other color.
    // loop is default and only configuration with no assignments.
    assignments.length === 0 ||
    !otherAssignment ||
    otherAssignment.color.type === 'loop'
  ) {
    return { isLoop: true };
  } else {
    return { isLoop: false, color: otherAssignment.color };
  }
}
