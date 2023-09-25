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
 * Helper to apply different validations depending on whether Kibana is running the Serverless or Traditional offering.
 *
 * @example Only allow the setting on Serverless
 * const config = schema.object({
 *   myProp: offeringBasedSchema({ serverless: schema.boolean({ defaultValue: true }) }),
 * });
 *
 * @example Only allow the setting on Traditional
 * const config = schema.object({
 *   myProp: offeringBasedSchema({ fullyManaged: schema.boolean({ defaultValue: true }) }),
 * });
 *
 * @example Fixed value on Traditional, configurable on Serverless
 * const config = schema.object({
 *   myProp: offeringBasedSchema({
 *     serverless: schema.boolean({ defaultValue: true }),
 *     traditional: schema.literal(false), // this can be skipped if users can't specify it in the config
 *     options: { defaultValue: false },
 *   }),
 * });
 *
 * @example Setting is changeable on all offerings but with different defaults
 * const config = schema.object({
 *   myProp: offeringBasedSchema({
 *     serverless: schema.boolean({ defaultValue: true }),
 *     traditional: schema.boolean({ defaultValue: false }),
 *   }),
 * });
 *
 * @param opts.serverless The validation to apply in the Serverless offering. If not provided, it doesn't allow the setting to be set in this offering.
 * @param opts.traditional The validation to apply in the Traditional offering. If not provided, it doesn't allow the setting to be set in this offering.
 * @param opts.options Any options to pass down in the types.
 */
export function offeringBasedSchema<V>(opts: {
  serverless?: Type<V>;
  traditional?: Type<V>;
  options?: TypeOptions<V>;
}) {
  const { serverless = schema.never(), traditional = schema.never(), options } = opts;
  return schema.conditional(
    schema.contextRef('serverless'),
    true,
    serverless,
    traditional,
    options
  );
}
