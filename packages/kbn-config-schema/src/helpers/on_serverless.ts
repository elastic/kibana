/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';
import { Type, TypeOptions } from '../types';

/**
 * Helper to apply different validations depending on whether Kibana is running on Serverless or not.
 *
 * @example Only allow the setting on Serverless
 * const config = schema.object({
 *   myProp: onServerless(schema.boolean({ defaultValue: true })),
 * });
 *
 * @example Fixed value on self-managed, configurable on Serverless
 * const config = schema.object({
 *   myProp: onServerless(schema.boolean({ defaultValue: true }), schema.literal(false), {
 *     defaultValue: false,
 *   }),
 * });
 *
 * @example Setting is changeable on all offerings but with different defaults
 * const config = schema.object({
 *   myProp: onServerless(
 *     schema.boolean({ defaultValue: true }),
 *     schema.boolean({ defaultValue: false })
 *   ),
 * });
 *
 * @param onServerlessType The validation to apply when in serverless
 * @param elseType The validation to apply otherwise. If not provided, it doesn't allow the setting to be set.
 * @param options Any options to pass down in the types.
 */
export function onServerless<V>(
  onServerlessType: Type<V>,
  elseType: Type<V | never> = schema.never(),
  options?: TypeOptions<V>
) {
  return schema.conditional(
    schema.contextRef('serverless'),
    true,
    onServerlessType,
    elseType,
    options
  );
}
