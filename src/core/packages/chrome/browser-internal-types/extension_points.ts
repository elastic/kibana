/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, LazyExoticComponent } from 'react';
import type { SolutionId } from '@kbn/core-chrome-browser';

/** @internal */
export interface SecondaryNavExtensionPointContext {
  extensionPointId: string;
  solutionId: SolutionId;
  primaryItemId: string;
  sectionId: string;
  surface: 'popover' | 'sidePanel' | 'overflow';
  activeItemId?: string;
}

/** @internal */
export type SecondaryNavExtensionPointComponent = ComponentType<SecondaryNavExtensionPointContext>;

/** @internal */
export type SecondaryNavExtensionPointLazy =
  LazyExoticComponent<SecondaryNavExtensionPointComponent>;

/** @internal */
export type ExtensionPointRenderersMap = Record<string, SecondaryNavExtensionPointLazy>;
