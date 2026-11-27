/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, type ReactNode } from 'react';

/** The developer toolbar's start contract, typed here so production code doesn't import the dev-only plugin. */
export interface DeveloperToolbarStart {
  registerItem: (item: { id: string; children: ReactNode; priority?: number }) => () => void;
}

const LazyTargetsPanel = lazy(() =>
  import('./targets_panel').then(({ TargetsPanel }) => ({ default: TargetsPanel }))
);

/** Adds the contrast targets panel to the developer toolbar, and returns its removal. */
export const registerExperimentalColorsToolbarItem = (
  developerToolbar: DeveloperToolbarStart | undefined
): (() => void) | undefined =>
  developerToolbar?.registerItem({
    id: 'Metric contrast',
    children: (
      <Suspense fallback={null}>
        <LazyTargetsPanel />
      </Suspense>
    ),
  });
