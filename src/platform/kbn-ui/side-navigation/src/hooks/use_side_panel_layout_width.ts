/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { useOptionalLayoutUpdate } from '@kbn/ui-chrome-layout';

import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from './use_layout_width';

interface UseSidePanelLayoutWidthArgs {
  hidePrimaryLabels: boolean;
  isSidePanelOpen: boolean;
  isSidePanelVisibilityAnimating: boolean;
  sidePanelWidth?: number;
  setWidth: (width: number) => void;
}

/**
 * Updates chrome navigation width in sync with side panel show/hide animations.
 * Layout transitions are enabled only while the panel is animating, never during resize.
 */
export const useSidePanelLayoutWidth = ({
  hidePrimaryLabels,
  isSidePanelOpen,
  isSidePanelVisibilityAnimating,
  sidePanelWidth,
  setWidth,
}: UseSidePanelLayoutWidthArgs) => {
  const updateLayout = useOptionalLayoutUpdate();
  const { euiTheme } = useEuiTheme();
  const navigationWidthTransition = useMemo(
    () => `${euiTheme.animation.slow} ${euiTheme.animation.resistance}`,
    [euiTheme.animation.resistance, euiTheme.animation.slow]
  );

  useLayoutEffect(() => {
    updateLayout?.({
      navigationWidthTransition: isSidePanelVisibilityAnimating
        ? navigationWidthTransition
        : undefined,
    });
  }, [isSidePanelVisibilityAnimating, navigationWidthTransition, updateLayout]);

  useLayoutEffect(() => {
    const baseWidth = hidePrimaryLabels ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
    const width = isSidePanelOpen ? baseWidth + (sidePanelWidth ?? 0) : baseWidth;
    setWidth(width);
  }, [hidePrimaryLabels, isSidePanelOpen, setWidth, sidePanelWidth]);
};
