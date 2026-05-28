/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License ../extension_point_idsServer Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { ExtensionPointRenderersMap } from '@kbn/ui-side-navigation';
import type { ExtractExtensionPointIds } from './extension_point_ids';

export * from './extensions';

export type { ExtractExtensionPointIds };

/**
 * Type for the extension point renderers for a given navigation tree definition.
 */
export type ExtensionPointRenderersFor<T extends NavigationTreeDefinition> = {
  [K in ExtractExtensionPointIds<T>]: ExtensionPointRenderersMap[string];
};

/**
 * Define the extension point renderers for a given navigation tree definition.
 */
export const defineExtensionPointRenderers = <T extends NavigationTreeDefinition>(
  renderers: ExtensionPointRenderersFor<T>
): ExtensionPointRenderersFor<T> => renderers;
