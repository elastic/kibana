/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AlertTypeParams as RuleTypeParams } from '../../../x-pack/plugins/alerting/common';

export const RAC_EXAMPLE_APP_ID = 'rac_example';

// always firing
export const DEFAULT_INSTANCES_TO_GENERATE = 5;
export interface AlwaysFiringThresholds {
  small?: number;
  medium?: number;
  large?: number;
}
export interface AlwaysFiringParams extends RuleTypeParams {
  instances?: number;
  thresholds?: AlwaysFiringThresholds;
}
export type AlwaysFiringActionGroupIds = keyof AlwaysFiringThresholds;
