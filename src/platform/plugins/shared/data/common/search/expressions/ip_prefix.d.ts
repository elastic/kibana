/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ExpressionFunctionDefinition,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/common';
export interface IpPrefix {
  prefixLength?: number;
  isIpv6?: boolean;
}
export type IpPrefixOutput = ExpressionValueBoxed<'ip_prefix', IpPrefix>;
export type ExpressionFunctionIpPrefix = ExpressionFunctionDefinition<
  'ipPrefix',
  null,
  IpPrefix,
  IpPrefixOutput
>;
export declare const ipPrefixFunction: ExpressionFunctionIpPrefix;
