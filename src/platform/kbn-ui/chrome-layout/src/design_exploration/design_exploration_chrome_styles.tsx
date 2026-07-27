/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { Global } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { getScrollContainer } from '@kbn/ui-chrome-layout-utils';
import { getDesignExplorationVariant } from '@kbn/core-chrome-feature-flags';
import {
  applyDesignExplorationKnobCssVars,
  DESIGN_EXPLORATION_KNOBS_CHANGED_EVENT,
} from './design_exploration_knobs';
import {
  createActiveDesignExplorationStyles,
  getActiveDesignExplorationVariant,
} from './design_exploration_variants';
import {
  DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR,
  DESIGN_EXPLORATION_BODY_ATTR,
  DESIGN_EXPLORATION_SCROLLED_BODY_ATTR,
  DESIGN_EXPLORATION_VARIANT_ATTR,
  createDesignExplorationScrollState,
  updateDesignExplorationScrollState,
} from './design_exploration_shared';

export {
  DESIGN_EXPLORATION_BODY_ATTR,
  DESIGN_EXPLORATION_VARIANT_ATTR,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_RADIUS_CONTAINER,
  DESIGN_EXPLORATION_RADIUS_CONTROL,
  designExplorationScope,
  designExplorationScopedInPanels,
} from './design_exploration_shared';

/**
 * Design exploration chrome POC — sets body scope for global style overrides when mounted.
 */
export const DesignExplorationChromeGlobalStyles = () => {
  const euiTheme = useEuiTheme();
  const activeVariantId = getDesignExplorationVariant();
  const colorMode = euiTheme.colorMode;

  useEffect(() => {
    document.body.setAttribute(DESIGN_EXPLORATION_BODY_ATTR, 'true');
    document.body.setAttribute(DESIGN_EXPLORATION_VARIANT_ATTR, activeVariantId);

    const syncKnobs = () => {
      const variant = getActiveDesignExplorationVariant();
      applyDesignExplorationKnobCssVars(variant.knobTokens, variant.id, colorMode);
    };

    syncKnobs();
    window.addEventListener(DESIGN_EXPLORATION_KNOBS_CHANGED_EVENT, syncKnobs);

    const scrollContainer = getScrollContainer();
    const scrollState = createDesignExplorationScrollState(scrollContainer.scrollTop);
    let frameId: number | undefined;

    const handleScroll = () => {
      if (frameId !== undefined) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = undefined;
        updateDesignExplorationScrollState(scrollContainer, scrollState);
      });
    };

    updateDesignExplorationScrollState(scrollContainer, scrollState);
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener(DESIGN_EXPLORATION_KNOBS_CHANGED_EVENT, syncKnobs);
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
      scrollContainer.removeEventListener('scroll', handleScroll);
      document.body.removeAttribute(DESIGN_EXPLORATION_BODY_ATTR);
      document.body.removeAttribute(DESIGN_EXPLORATION_VARIANT_ATTR);
      document.body.removeAttribute(DESIGN_EXPLORATION_SCROLLED_BODY_ATTR);
      document.body.removeAttribute(DESIGN_EXPLORATION_APP_HEADER_HIDDEN_BODY_ATTR);
    };
  }, [activeVariantId, colorMode]);

  return <Global styles={createActiveDesignExplorationStyles(euiTheme)} />;
};
