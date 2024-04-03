/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

/** @public */
export interface ChromeNavControl {
  order?: number;
  mount: MountPoint;
}

/** @public */
export interface ChromeHelpMenuLink {
  title: string;
  href?: string;
  iconType?: string;
  onClick?: () => void;
  dataTestSubj?: string;
}

/**
 * {@link ChromeNavControls | APIs} for registering new controls to be displayed in the navigation bar.
 *
 * @example
 * Register a left-side nav control rendered with React.
 * ```jsx
 * chrome.navControls.registerLeft({
 *   mount(targetDomElement) {
 *     ReactDOM.mount(<MyControl />, targetDomElement);
 *     return () => ReactDOM.unmountComponentAtNode(targetDomElement);
 *   }
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

  /** Set the help menu links */
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
