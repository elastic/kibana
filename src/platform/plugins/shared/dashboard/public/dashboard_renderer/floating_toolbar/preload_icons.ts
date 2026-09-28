/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';

/**
 * Icons used by the floating bars (selected panels toolbar, its popovers and pickers, hint bar).
 *
 * EuiIcon loads icons on demand: an icon that isn't cached yet mounts as a faint placeholder and
 * fades in (250ms, ease-in) once loaded. The first time a bar appears, its icons would trail behind
 * the bar's entrance. Caching them up front makes the bar's content appear together with it.
 */
const FLOATING_TOOLBAR_ICONS = [
  // toolbar
  'cross',
  'addToChat',
  'copy',
  'addToDashboard',
  'section',
  'grid',
  'maximize',
  'minimize',
  // layout popover
  'alignTop',
  'alignRight',
  // expanded options
  'palette',
  'flag',
  'trash',
  // share colors picker
  'chartBarVertical',
  'chartLine',
  'chartArea',
  'chartPie',
  'chartHeatmap',
  'chartMetric',
  'chartGauge',
  'chartTagCloud',
  'visTable',
];

let preloading: Promise<void> | undefined;

/** Caches the floating bars' icons in EuiIcon's synchronous cache. Safe to call repeatedly. */
export const preloadFloatingToolbarIcons = (): Promise<void> => {
  if (!preloading) {
    preloading = (async () => {
      const [{ typeToPathMap }, { appendIconComponentCache }] = await Promise.all([
        // @ts-expect-error - no declarations for this internal module
        import('@elastic/eui/optimize/es/components/icon/icon_map'),
        // @ts-expect-error - no declarations for this internal module
        import('@elastic/eui/optimize/es/components/icon/icon'),
      ]);
      const loaders = typeToPathMap as Record<string, () => Promise<{ icon: ComponentType }>>;
      const cache: Record<string, ComponentType> = {};
      await Promise.all(
        FLOATING_TOOLBAR_ICONS.filter((type) => loaders[type]).map(async (type) => {
          cache[type] = (await loaders[type]()).icon;
        })
      );
      appendIconComponentCache(cache);
    })().catch(() => {
      // best effort: icons still load on demand
    });
  }
  return preloading;
};
