/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TimelionFunctionArgs } from '../../../common/types';

export interface TimelionFunctionInterface extends TimelionFunctionConfig {
  chainable: boolean;
  originalFn: Function;
  argsByName: TimelionFunctionArgs[];
}

export interface TimelionFunctionConfig {
  name: string;
  help: string;
  extended: boolean;
  aliases: string[];
  fn: Function;
  args: TimelionFunctionArgs[];
}

// eslint-disable-next-line import/no-default-export
export default class TimelionFunction {
  constructor(name: string, config: TimelionFunctionConfig);
}
