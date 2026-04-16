/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isVisualRegressionEnabled } from '../runtime/environment';

interface RunVisualStepOptions<T> {
  snapshot: boolean;
  body: () => Promise<T> | T;
  capture: () => Promise<void>;
}

export const runVisualStep = async <T>({
  snapshot,
  body,
  capture,
}: RunVisualStepOptions<T>): Promise<T> => {
  const value = await body();

  if (snapshot && isVisualRegressionEnabled()) {
    await capture();
  }

  return value;
};
