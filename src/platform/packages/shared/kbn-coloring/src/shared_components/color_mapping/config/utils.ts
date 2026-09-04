/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getColorAssignmentMatcher } from '../color/color_assignment_matcher';
import { OTHER_BUCKET_VALUE } from '../special_tokens';
import { DEFAULT_OTHERS_BUCKET_ASSIGNMENT } from './default_color_mapping';
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

export function normalizeColorMappingConfig(config: Config): Config {
  const { assignments, specialAssignments } = config;
  const assignmentMatcher = getColorAssignmentMatcher(assignments);

  // if the other bucket is assigned, we need to remove it from the assignments and add a special assignment for it
  if (assignmentMatcher.hasMatch(OTHER_BUCKET_VALUE)) {
    const assignedColor = assignments[assignmentMatcher.getIndex(OTHER_BUCKET_VALUE)].color;

    if (assignedColor.type === 'gradient') {
      // we can't migrate gradient colors, so we don't add a special assignment for it, it will show as 'auto'
      return config;
    }

    return {
      ...config,
      assignments: assignments
        .map((assignment) => ({
          ...assignment,
          rules: assignment.rules.filter((rule) => {
            if (rule.type === 'raw') {
              return rule.value !== OTHER_BUCKET_VALUE;
            }
            if (rule.type === 'match') {
              return rule.pattern !== OTHER_BUCKET_VALUE;
            }
            return true;
          }),
        }))
        .filter((assignment) => assignment.rules.length > 0),
      specialAssignments: [
        ...specialAssignments.filter((assignment) => !isOtherBucketAssignment(assignment)),
        {
          ...DEFAULT_OTHERS_BUCKET_ASSIGNMENT,
          color: assignedColor,
        } satisfies OtherBucketAssignment,
      ],
    };
  }

  return config;
}
