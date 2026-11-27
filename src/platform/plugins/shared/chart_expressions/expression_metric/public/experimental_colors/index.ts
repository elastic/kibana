/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Experimental metric tile colors, behind the `lens.metric.experimentalColors` feature flag.
 * To add a variant, add it to `variants.ts`. To remove the experiment, delete this folder and its
 * uses in `components/metric_vis.tsx` and `plugin.ts`. `plugin.ts`
 */
export { useExperimentalColors, type ExperimentalColors } from './use_experimental_colors';
export {
  registerExperimentalColorsToolbarItem,
  type DeveloperToolbarStart,
} from './register_toolbar_item';
