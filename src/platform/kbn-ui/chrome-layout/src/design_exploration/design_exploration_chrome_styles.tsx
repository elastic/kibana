/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { Global, css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

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

export const DESIGN_EXPLORATION_BODY_ATTR = 'data-design-exploration';

const panelSelectorList = [
  '.kbnChromeLayoutNavigation',
  '.kbnChromeLayoutApplication',
  '.kbnChromeNav-sidePanel',
];

/** Body scope prefix for design exploration overrides. */
export const designExplorationScope = () => `body[${DESIGN_EXPLORATION_BODY_ATTR}='true']`;

/** Scope descendant selectors to each chrome panel under the design exploration body attr. */
export const designExplorationScopedInPanels = (selectors: string) => {
  const scope = designExplorationScope();

  return selectors
    .split(', ')
    .flatMap((selector) => panelSelectorList.map((panel) => `${scope} ${panel} ${selector}`))
    .join(', ');
};

const designExplorationChromeStyles = (euiTheme: UseEuiTheme) => {
  const scope = designExplorationScope();
  const { colors } = euiTheme.euiTheme;

  return css`
    ${scope} [data-test-subj='kbnGridLayout'] {
      --kbnGridGutterSize: 12 !important;
      padding: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope} [data-test-subj='embeddablePanel'] {
      border-radius: ${DESIGN_EXPLORATION_RADIUS_CONTROL}px !important;
    }

    ${scope} [data-test-subj='globalQueryBar'] {
      padding: ${DESIGN_EXPLORATION_PADDING}px !important;
      padding-bottom: 12px !important;
    }

    ${scope} [data-test-subj='controls-group-wrapper'] {
      padding-inline: ${DESIGN_EXPLORATION_PADDING}px !important;
      padding-bottom: ${DESIGN_EXPLORATION_PADDING}px !important;
    }

    ${scope}:has([data-test-subj='dashboardContainer'], #dashboardListingHeading)
      [data-test-subj='appHeader'] {
      padding-inline: ${DESIGN_EXPLORATION_PADDING}px !important;
      margin-inline: 0 !important;
      margin-top: 0 !important;
      border-radius: ${DESIGN_EXPLORATION_RADIUS_CONTROL}px !important;
    }

    ${scope} .kbnChromeLayoutApplication {
      background-color: transparent !important;
      box-shadow: none !important;
    }

    ${scope} .kbnChromeLayoutApplication div:has(> #dashboardTitle) {
      background: transparent !important;
    }

    ${scope} .dshDashboardViewportWrapper,
    ${scope} .dshDashboardViewportWrapper--defaultBg {
      background-color: transparent !important;
    }

    ${scope} .kbnChromeLayoutNavigation {
      border-inline-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }

    ${scope} .kbnChromeLayoutHeader {
      border-block-end: ${DESIGN_EXPLORATION_BORDER_WIDTH}px solid ${colors.borderBaseSubdued} !important;
    }
  `;
};

/**
 * Design exploration chrome POC — sets body scope for global style overrides when mounted.
 */
export const DesignExplorationChromeGlobalStyles = () => {
  const euiTheme = useEuiTheme();

  useEffect(() => {
    document.body.setAttribute(DESIGN_EXPLORATION_BODY_ATTR, 'true');

    return () => {
      document.body.removeAttribute(DESIGN_EXPLORATION_BODY_ATTR);
    };
  }, []);

  return <Global styles={designExplorationChromeStyles(euiTheme)} />;
};
