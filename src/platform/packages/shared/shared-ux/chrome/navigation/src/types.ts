/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';

import type {
  ChromeNavLink,
  ChromeProjectNavigationNode,
  ChromeRecentlyAccessedHistoryItem,
  PanelSelectedNode,
} from '@kbn/core-chrome-browser';
import type { EventTracker } from './analytics';

export type BasePathService = Pick<IBasePath, 'prepend' | 'remove'>;

/**
 * @internal
 */

export type NavigateToUrlFn = ApplicationStart['navigateToUrl'];

/**
 * A list of services that are consumed by this component.
 * @public
 */
export interface NavigationServices {
  basePath: BasePathService;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  navigateToUrl: NavigateToUrlFn;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;
  isSideNavCollapsed: boolean;
  eventTracker: EventTracker;
  selectedPanelNode?: PanelSelectedNode | null;
  setSelectedPanelNode?: (node: PanelSelectedNode | null) => void;
  isFeedbackBtnVisible$: Observable<boolean>;
}

/**
 * An interface containing a collection of Chrome dependencies required to
 * render this component
 * @public
 */
export interface NavigationChromeDependencies {
  navigateToUrl: NavigateToUrlFn;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  navLinks$: Observable<Readonly<ChromeNavLink[]>>;
  isCollapsed$: Observable<boolean>;
  panelSelectedNode$: Observable<PanelSelectedNode | null>;
  setPanelSelectedNode: (node: string | PanelSelectedNode | null) => void;
  isFeedbackBtnVisible$: Observable<boolean>;
  basePath: BasePathService;
  loadingCount$: Observable<number>;
  reportEvent: (eventType: string, eventData: object) => void;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;
}
