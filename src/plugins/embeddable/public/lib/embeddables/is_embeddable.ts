/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IEmbeddable } from './i_embeddable';

export const isEmbeddable = (x: unknown): x is IEmbeddable => {
  if (!x) return false;
  if (typeof x !== 'object') return false;
  if (typeof (x as IEmbeddable).id !== 'string') return false;
  if (typeof (x as IEmbeddable).getInput !== 'function') return false;
  if (typeof (x as IEmbeddable).supportedTriggers !== 'function') return false;
  return true;
};
