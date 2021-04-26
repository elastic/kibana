/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedVis } from './vis';
import type { VisParams } from '../common';

export const createVisAsync = async <TVisParams = VisParams>(
  visType: string,
  visState: SerializedVis<TVisParams> = {} as any
) => {
  const { Vis } = await import('./vis');
  const vis = new Vis(visType, visState);
  await vis.setState(visState);
  return vis;
};
