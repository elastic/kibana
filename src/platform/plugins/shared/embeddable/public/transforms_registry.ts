/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableTransforms } from '../common';
import type { getTransformDrilldownsOut } from '../common/drilldowns/transform_drilldowns_out';

const registry: {
  [key: string]: (
    transformDrilldownsOut: ReturnType<typeof getTransformDrilldownsOut>
  ) => Promise<EmbeddableTransforms['transformOut']>;
} = {};

export function registerLegacyURLTransform(
  type: string,
  getTransformOut: () => Promise<EmbeddableTransforms['transformOut']>
) {
  if (registry[type]) {
    throw new Error(`Embeddable legacy URL transform for type "${type}" is already registered.`);
  }

  registry[type] = getTransformOut;
}

export async function getLegacyURLTransform(type: string) {
  const { getTransformDrilldownsOut } = await import(
    '../common/drilldowns/transform_drilldowns_out'
  );
  // TODO replace with function that gets transformDrilldownOut from registry
  const placeholderGetDrilldownTransformOut = (drilldownType: string) => undefined;
  const transformDrilldownsOut = getTransformDrilldownsOut(placeholderGetDrilldownTransformOut);
  return await registry[type]?.(transformDrilldownsOut);
}

export function hasLegacyURLTransform(type: string) {
  return Boolean(registry[type]);
}
