/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ChromeExtensionContent } from '@kbn/core-mount-utils-browser';

/** @public */
export interface ChromeNavControl {
  order?: number;
  mount: ChromeExtensionContent;
}

/** @public */
export interface ChromeHelpMenuLink {
  title: string;
  href?: string;
  onClick?: () => void;
  dataTestSubj?: string;
}

/**
 * {@link ChromeNavControls | APIs} for registering new controls to be displayed in the navigation bar.
 *
 * @example
 * Register a lazy-loaded nav control (recommended — encourages bundle splitting):
 * ```tsx
 * import { dynamic } from '@kbn/shared-ux-utility';
 *
 * const LazyMyControl = dynamic(() => import('./my_control'));
 *
 * chrome.navControls.registerLeft({
 *   mount: <LazyMyControl />,
 * })
 * ```
 *
 * @example
 * Register a lightweight nav control inline (no lazy loading needed):
 * ```tsx
 * chrome.navControls.registerLeft({
 *   mount: <MySmallControl />,
 * })
 * ```
 *
 * @public
 */
export interface ChromeNavControls {
  /** Register a nav control to be presented on the bottom-left side of the chrome header. */
  registerLeft(navControl: ChromeNavControl): void;

  /** Register a nav control to be presented on the top-right side of the chrome header. */
  registerRight(navControl: ChromeNavControl): void;

  /** Register a nav control to be presented on the top-center side of the chrome header. */
  registerCenter(navControl: ChromeNavControl): void;

  /** Register an extension to be presented to the left of the top-right side of the chrome header. */
  registerExtension(navControl: ChromeNavControl): void;

  /**
   * Set the help menu links
   * @deprecated Use {@link ChromeStart.setHelpMenuLinks} instead
   */
  setHelpMenuLinks(links: ChromeHelpMenuLink[]): void;

  /** @internal */
  getLeft$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getRight$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getCenter$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getExtension$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getHelpMenuLinks$(): Observable<ChromeHelpMenuLink[]>;
}
