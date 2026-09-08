/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownTransforms, EmbeddableTransforms } from '../../common';
import type { getTransformDrilldownsOut } from '../../common/drilldowns/transform_drilldowns_out';

const registry: {
  [key: string]: (
    transformDrilldownsOut: ReturnType<typeof getTransformDrilldownsOut>
  ) => Promise<EmbeddableTransforms['transformOut']>;
} = {};

/*
 * Container applications such as Dashboard store embeddable state in URLs.
 * Use this registry for BWC when reading state from URLs
 */
export function registerLegacyURLTransform(
  type: string,
  getTransformOut: (
    transformDrilldownsOut: DrilldownTransforms['transformOut']
  ) => Promise<EmbeddableTransforms['transformOut']>
) {
  if (registry[type]) {
    throw new Error(`Embeddable legacy URL transform for type "${type}" is already registered.`);
  }

  registry[type] = getTransformOut;
}

export async function getLegacyURLTransform(embeddableType: string) {
  const { getTransformDrilldownsOut, transformDashboardDrilldown } = await import(
    '../async_module'
  );
  const transformDrilldownsOut = getTransformDrilldownsOut((drilldownType: string) => {
    return drilldownType === 'dashboard_drilldown' ? transformDashboardDrilldown : undefined;
  });
  return await registry[embeddableType]?.(transformDrilldownsOut);
}

export function hasLegacyURLTransform(type: string) {
  return Boolean(registry[type]);
}
