/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

/** Gutter between chrome panels. */
export const DESIGN_EXPLORATION_GAP = 8;

/** Border radius for chrome panel containers. */
export const DESIGN_EXPLORATION_RADIUS_CONTAINER = 12;

/** Border radius for buttons and inputs inside chrome panels. */
export const DESIGN_EXPLORATION_RADIUS_CONTROL = 8;

/** Hairline outline on panel containers. */
export const DESIGN_EXPLORATION_BORDER_WIDTH = 0.5;

/** Default inner padding for nav panel content. */
export const DESIGN_EXPLORATION_PADDING = 16;

/** Compact inner padding for tighter chrome regions. */
export const DESIGN_EXPLORATION_PADDING_COMPACT = 12;

/** Application top bar slot height when Chrome app header is shown. */
export const DESIGN_EXPLORATION_TOP_BAR_HEIGHT = 72;

export const DESIGN_EXPLORATION_BODY_ATTR = 'data-design-exploration';

/** Active design direction slug, e.g. `verbana`. */
export const DESIGN_EXPLORATION_VARIANT_ATTR = 'data-design-exploration-variant';

/** Set on body when the app scroll container (ancestor of `.kbnAppWrapper`) has scrolled. */
export const DESIGN_EXPLORATION_SCROLLED_BODY_ATTR = 'data-design-exploration-scrolled';

/** Set on body when the dashboard AppHeader should collapse while scrolled. */
export const DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR =
  'data-design-exploration-app-header-hidden';

/** Minimum downward scroll before hiding the dashboard AppHeader. */
export const DESIGN_EXPLORATION_APP_HEADER_HIDE_SCROLL_THRESHOLD = 16;

/** Minimum upward scroll before showing the dashboard AppHeader again. */
export const DESIGN_EXPLORATION_APP_HEADER_SHOW_SCROLL_THRESHOLD = 8;

/** Ignore hide/show toggles briefly after a visibility change while layout settles. */
export const DESIGN_EXPLORATION_APP_HEADER_TOGGLE_COOLDOWN_MS = 300;

export const DASHBOARD_CONTAINER_SELECTOR = '[data-test-subj="dashboardContainer"]';

/** Empty listing prompt heading; absent on the populated listing table. */
export const DASHBOARD_LISTING_HEADING_SELECTOR = '#dashboardListingHeading';

/** Create-dashboard action in the inline listing AppHeader. */
export const DASHBOARD_LISTING_CREATE_BUTTON_SELECTOR =
  '[data-test-subj="dashboardListingCreateButton"]';

/** Scope to dashboard view or listing (not other apps). */
export const DASHBOARDS_APP_HAS_SELECTOR = `:has(${DASHBOARD_CONTAINER_SELECTOR}, ${DASHBOARD_LISTING_HEADING_SELECTOR}, ${DASHBOARD_LISTING_CREATE_BUTTON_SELECTOR})`;

const panelSelectorList = [
  '.kbnChromeLayoutNavigation',
  '.kbnChromeLayoutApplication',
  '.kbnChromeNav-sidePanel',
];

/** Body scope prefix for design exploration overrides. */
export const designExplorationScope = () => `body[${DESIGN_EXPLORATION_BODY_ATTR}='true']`;

/** Body scope for a specific design exploration variant. */
export const designExplorationVariantScope = (variantId: string) =>
  `body[${DESIGN_EXPLORATION_BODY_ATTR}='true'][${DESIGN_EXPLORATION_VARIANT_ATTR}='${variantId}']`;

/** Scope descendant selectors to each chrome panel under the design exploration body attr. */
export const designExplorationScopedInPanels = (selectors: string) => {
  const scope = designExplorationScope();

  return selectors
    .split(', ')
    .flatMap((selector) => panelSelectorList.map((panel) => `${scope} ${panel} ${selector}`))
    .join(', ');
};

export const getEmbeddablePanelShadow = (euiTheme: UseEuiTheme) => {
  const { colors } = euiTheme.euiTheme;
  const isDarkMode = euiTheme.colorMode === 'DARK';

  return isDarkMode
    ? `0 0 0 1px color-mix(in srgb, ${colors.borderBaseSubdued} 45%, transparent), 0 2px 4px rgba(0, 0, 0, 0.28)`
    : `0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.55)`;
};

export interface DesignExplorationScrollState {
  /** Whether the dashboard AppHeader is currently hidden. */
  appHeaderHidden: boolean;
  /** Scroll position when app header visibility last changed. */
  toggleAnchorScrollTop: number;
  /** Timestamp after which hide/show evaluation may resume. */
  toggleLockedUntil: number;
}

export const createDesignExplorationScrollState = (
  scrollTop: number
): DesignExplorationScrollState => ({
  appHeaderHidden: false,
  toggleAnchorScrollTop: scrollTop,
  toggleLockedUntil: 0,
});

const lockAppHeaderToggle = (state: DesignExplorationScrollState, scrollTop: number) => {
  state.toggleAnchorScrollTop = scrollTop;
  state.toggleLockedUntil = Date.now() + DESIGN_EXPLORATION_APP_HEADER_TOGGLE_COOLDOWN_MS;
};

export const setBodyAttr = (attr: string, enabled: boolean) => {
  if (enabled) {
    document.body.setAttribute(attr, 'true');
  } else {
    document.body.removeAttribute(attr);
  }
};

export const updateDesignExplorationScrollState = (
  scrollContainer: HTMLElement,
  state: DesignExplorationScrollState
) => {
  const scrollTop = scrollContainer.scrollTop;
  const isDashboard = Boolean(document.querySelector(DASHBOARD_CONTAINER_SELECTOR));

  setBodyAttr(DESIGN_EXPLORATION_SCROLLED_BODY_ATTR, scrollTop > 0);

  if (!isDashboard || scrollTop <= 0) {
    state.appHeaderHidden = false;
    state.toggleAnchorScrollTop = scrollTop;
    state.toggleLockedUntil = 0;
    setBodyAttr(DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR, false);
    return;
  }

  const now = Date.now();

  if (state.toggleLockedUntil !== 0 && now >= state.toggleLockedUntil) {
    state.toggleLockedUntil = 0;
    state.toggleAnchorScrollTop = scrollTop;
  }

  if (state.toggleLockedUntil !== 0 && now < state.toggleLockedUntil) {
    setBodyAttr(DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR, state.appHeaderHidden);
    return;
  }

  const deltaFromAnchor = scrollTop - state.toggleAnchorScrollTop;

  if (
    !state.appHeaderHidden &&
    deltaFromAnchor >= DESIGN_EXPLORATION_APP_HEADER_HIDE_SCROLL_THRESHOLD
  ) {
    state.appHeaderHidden = true;
    lockAppHeaderToggle(state, scrollTop);
  } else if (
    state.appHeaderHidden &&
    deltaFromAnchor <= -DESIGN_EXPLORATION_APP_HEADER_SHOW_SCROLL_THRESHOLD
  ) {
    state.appHeaderHidden = false;
    lockAppHeaderToggle(state, scrollTop);
  }

  setBodyAttr(DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR, state.appHeaderHidden);
};
