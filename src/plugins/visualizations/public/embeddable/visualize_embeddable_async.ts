/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { VisualizeEmbeddable as VisualizeEmbeddableType } from './visualize_embeddable';

export const createVisualizeEmbeddableAsync = async (
  ...args: ConstructorParameters<typeof VisualizeEmbeddableType>
) => {
  // Build optimization. Move app styles from main bundle
  // @ts-expect-error TS error, cannot find type declaration for scss
  await import('./embeddables.scss');

  const { VisualizeEmbeddable } = await import('./visualize_embeddable');

  return new VisualizeEmbeddable(...args);
};
