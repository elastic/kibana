/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { type LayoutService } from './layout_service';

export { useLayoutUpdate } from '@kbn/ui-chrome-layout';

export {
  layoutVar,
  layoutVarName,
  layoutLevels,
  APP_MAIN_SCROLL_CONTAINER_ID,
  FLYOUT_SELECTOR,
  MAIN_CONTENT_SELECTORS,
  SIDE_PANEL_CONTENT_GAP,
  euiIncludeSelectorInFocusTrap,
} from '@kbn/ui-chrome-layout';
export type {
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
} from '@kbn/ui-chrome-layout';

export {
  type ScrollContainer,
  getScrollContainer,
  scrollTo,
  scrollToTop,
  scrollToBottom,
  getViewportHeight,
  getViewportBoundaries,
  getScrollPosition,
  getScrollDimensions,
  scrollBy,
  isAtBottomOfPage,
  type HighContrastSeparatorOptions,
  getHighContrastBorder,
  getHighContrastSeparator,
  useCurrentChromeApplicationBreakpoint,
  useIsWithinChromeApplicationBreakpoints,
} from '@kbn/ui-chrome-layout';

export { APP_FIXED_VIEWPORT_ID } from './kibana_layout_constants';
