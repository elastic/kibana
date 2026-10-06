/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { YAMLMap, Scalar } from 'yaml';

export interface StepPropInfo {
  path: string[];
  keyNode: Scalar<unknown>;
  valueNode: Scalar<unknown>;
}

export interface StepInfo {
  stepId: string;
  stepType: string;
  stepYamlNode: YAMLMap<unknown, unknown>;
  lineStart: number;
  lineEnd: number;
  propInfos: Record<string, StepPropInfo>;
  parentStepId?: string;
}

export interface WorkflowLookup {
  steps: Record<string, StepInfo>;
  triggersLineStart?: number;
}
