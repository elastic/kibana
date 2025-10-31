/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState } from '../../schema';
import type { LensAttributes } from '../../types';

export function fromAPItoLensState(config: XYState): LensAttributes {
  return { title: config.title ?? '', ...config } as unknown as LensAttributes;
}

export function fromLensStateToAPI(config: LensAttributes): XYState {
  return config as unknown as XYState;
}
