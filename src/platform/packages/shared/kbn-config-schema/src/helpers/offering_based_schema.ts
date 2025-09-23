/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';
import type { Type } from '../types';
import type { DefaultValue, TypeOptions } from '../types/type';

/**
 * Helper to apply different validations depending on whether Kibana is running the Serverless or Traditional offering.
 *
 * @remark This utility is intended to be used for Kibana YAML-based configuration validation only! Using it in other
 *         contexts will lead to only `traditional` validation being used.
 *
 *         If you want to switch schemas based on the offering in other contexts do the following:
 *
 * ```ts
 * // env is passed to your plugin constructor
 * const schema = env.packageInfo.buildFlavor === 'serverless' ? baseSchema.extend(a) : baseSchema.extend(b);
 * ```
 *
 * @example
 * Only allow the setting on Serverless
 * ```ts
 * const config = schema.object({
 *   myProp: offeringBasedSchema({ serverless: schema.boolean({ defaultValue: true }) }),
 * });
 * ```
 *
 * @example
 * Only allow the setting on Traditional
 * ```ts
 * const config = schema.object({
 *   myProp: offeringBasedSchema({ fullyManaged: schema.boolean({ defaultValue: true }) }),
 * });
 * ```
 * @example
 * Fixed value on Traditional, configurable on Serverless
 * ```ts
 * const config = schema.object({
 *   myProp: offeringBasedSchema({
 *     serverless: schema.boolean({ defaultValue: true }),
 *     traditional: schema.literal(false), // this can be skipped if users can't specify it in the config
 *     options: { defaultValue: false },
 *   }),
 * });
 * ```
 *
 *
 * @example
 * Setting is changeable on all offerings but with different defaults
 * ```ts
 * const config = schema.object({
 *   myProp: offeringBasedSchema({
 *     serverless: schema.boolean({ defaultValue: true }),
 *     traditional: schema.boolean({ defaultValue: false }),
 *   }),
 * });
 * ```
 *
 * @param opts.serverless The validation to apply in the Serverless offering. If not provided, it doesn't allow the setting to be set in this offering.
 * @param opts.traditional The validation to apply in the Traditional offering. If not provided, it doesn't allow the setting to be set in this offering.
 * @param opts.options Any options to pass down in the types.
 */
export function offeringBasedSchema<
  Output,
  Input = Output,
  SLD extends DefaultValue<Input> = never,
  TRD extends DefaultValue<Input> = never,
  DV extends DefaultValue<Input> = never
>(opts: {
  serverless?: Type<Output, Input, SLD>;
  traditional?: Type<Output, Input, TRD>;
  options?: TypeOptions<Output, Input, DV>;
}) {
  const { serverless = schema.never(), traditional = schema.never(), options } = opts;
  return schema.conditional(
    schema.contextRef<boolean>('serverless'),
    true,
    serverless,
    traditional,
    options
  );
}
