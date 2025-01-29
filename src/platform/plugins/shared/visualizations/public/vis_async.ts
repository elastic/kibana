/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedVis } from './vis';
import type { VisParams } from '../common';

export const createVisAsync = async <TVisParams extends VisParams = VisParams>(
  visType: string,
  visState: SerializedVis<TVisParams> = {} as any
) => {
  // Build optimization. Move app styles from main bundle
  // @ts-expect-error TS error, cannot find type declaration for scss
  await import('./vis.scss');

  const { Vis } = await import('./vis');
  const vis = new Vis(visType, visState);

  await vis.setState(visState);
  return vis;
};
