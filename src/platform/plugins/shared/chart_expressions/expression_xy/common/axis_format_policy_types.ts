/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Position } from '@elastic/charts';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export interface AxisPolicyMember {
  layerId: string;
  accessor: string;
  factor: number;
  format: SerializedFieldFormat;
  kind: 'data' | 'reference';
}

export interface AxisFormatMismatch {
  layerId: string;
  accessor: string;
  format: SerializedFieldFormat;
}

export interface AxisFormatPolicy {
  groupId: string;
  position: typeof Position.Left | typeof Position.Right;
  anchor: { layerId: string; accessor: string };
  formatter: SerializedFieldFormat;
  coordinateUnit?: string;
  members: AxisPolicyMember[];
  mismatches: AxisFormatMismatch[];
  source: 'inferred';
}
