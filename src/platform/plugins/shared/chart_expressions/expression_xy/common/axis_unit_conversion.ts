/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxisFormatPolicy } from './axis_format_policy_types';

/** Multiply a source-unit number by the member factor to reach the axis coordinate unit. */
export const toCoordinateUnitValue = (sourceValue: number, factor: number): number =>
  factor === 1 ? sourceValue : sourceValue * factor;

/** Divide a coordinate-unit number by the member factor to recover the source unit. */
export const toSourceUnitValue = (coordinateValue: number, factor: number): number =>
  factor === 1 ? coordinateValue : coordinateValue / factor;

export const getDataMemberFactor = (
  policies: AxisFormatPolicy[] | undefined,
  layerId: string,
  accessor: string
): number =>
  policies
    ?.flatMap((policy) => policy.members)
    .find(
      (member) =>
        member.kind === 'data' && member.layerId === layerId && member.accessor === accessor
    )?.factor ?? 1;
