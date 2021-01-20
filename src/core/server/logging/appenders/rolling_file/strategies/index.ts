/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { RollingStrategy } from './strategy';
import {
  NumericRollingStrategy,
  NumericRollingStrategyConfig,
  numericRollingStrategyConfigSchema,
} from './numeric';
import { RollingFileContext } from '../rolling_file_context';

export { RollingStrategy } from './strategy';
export type RollingStrategyConfig = NumericRollingStrategyConfig;

const defaultStrategy: NumericRollingStrategyConfig = {
  kind: 'numeric',
  pattern: '-%i',
  max: 7,
};

export const rollingStrategyConfigSchema = schema.oneOf([numericRollingStrategyConfigSchema], {
  defaultValue: defaultStrategy,
});

export const createRollingStrategy = (
  config: RollingStrategyConfig,
  context: RollingFileContext
): RollingStrategy => {
  return new NumericRollingStrategy(config, context);
};
