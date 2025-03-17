/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonIcon, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { throttle } from 'lodash';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import useEvent from 'react-use/lib/useEvent';
import type { TabItem } from '../types';
import { calculateResponsiveTabs } from '../utils/calculate_responsive_tabs';

const SCROLL_STEP = 200;

interface ScrollState {
  isScrollableLeft: boolean;
  isScrollableRight: boolean;
}

export interface UseResponsiveTabsProps {
  items: TabItem[];
  hasReachedMaxItemsCount: boolean;
  tabsContainerWithPlusElement: Element | null;
  tabsContainerElement: Element | null;
}

export const useResponsiveTabs = ({
  items,
  hasReachedMaxItemsCount,
  tabsContainerWithPlusElement,
  tabsContainerElement,
}: UseResponsiveTabsProps) => {
  const { euiTheme } = useEuiTheme();
  const dimensions = useResizeObserver(tabsContainerWithPlusElement);
  const tabsSizeConfig = useMemo(
    () =>
      calculateResponsiveTabs({ items, containerWidth: dimensions.width, hasReachedMaxItemsCount }),
    [items, dimensions.width, hasReachedMaxItemsCount]
  );

  const [scrollState, setScrollState] = useState<ScrollState>();

  const scrollLeftButtonLabel = i18n.translate('unifiedTabs.scrollLeftButton', {
    defaultMessage: 'Scroll left',
  });

  const scrollRightButtonLabel = i18n.translate('unifiedTabs.scrollRightButton', {
    defaultMessage: 'Scroll right',
  });

  const onScroll = useCallback(() => {
    setScrollState(calculateScrollState(tabsContainerElement));
  }, [tabsContainerElement, setScrollState]);

  const onScrollThrottled = useMemo(
    () => throttle(onScroll, 200, { leading: false, trailing: true }),
    [onScroll]
  );

  useEvent('scroll', onScrollThrottled, tabsContainerElement);

  useEffect(() => {
    onScrollThrottled();
  }, [tabsContainerElement, onScrollThrottled]);

  const scrollLeft = useCallback(() => {
    if (tabsContainerElement) {
      tabsContainerElement.scrollLeft = Math.max(tabsContainerElement.scrollLeft - SCROLL_STEP, 0);
      onScrollThrottled();
    }
  }, [tabsContainerElement, onScrollThrottled]);

  const scrollRight = useCallback(() => {
    if (tabsContainerElement) {
      tabsContainerElement.scrollLeft = Math.min(
        tabsContainerElement.scrollLeft + SCROLL_STEP,
        tabsContainerElement.scrollWidth
      );
      onScrollThrottled();
    }
  }, [tabsContainerElement, onScrollThrottled]);

  const scrollLeftButton = useMemo(
    () =>
      tabsSizeConfig.isScrollable ? (
        <EuiButtonIcon
          data-test-subj="unifiedTabs_tabsBar_scrollLeftBtn"
          iconType="arrowLeft"
          color="text"
          disabled={scrollState?.isScrollableLeft === false}
          aria-label={scrollLeftButtonLabel}
          title={scrollLeftButtonLabel}
          onClick={scrollLeft}
        />
      ) : null,
    [scrollLeftButtonLabel, scrollLeft, tabsSizeConfig.isScrollable, scrollState?.isScrollableLeft]
  );

  const scrollRightButton = useMemo(
    () =>
      tabsSizeConfig.isScrollable ? (
        <EuiButtonIcon
          data-test-subj="unifiedTabs_tabsBar_scrollRightBtn"
          iconType="arrowRight"
          color="text"
          disabled={scrollState?.isScrollableRight === false}
          aria-label={scrollRightButtonLabel}
          title={scrollRightButtonLabel}
          onClick={scrollRight}
        />
      ) : null,
    [
      scrollRightButtonLabel,
      scrollRight,
      tabsSizeConfig.isScrollable,
      scrollState?.isScrollableRight,
    ]
  );

  const tabsContainerCss = useMemo(() => {
    let overflowGradient = '';
    if (scrollState?.isScrollableLeft && scrollState?.isScrollableRight) {
      overflowGradient = `
        mask-image: linear-gradient(
          to right,
          rgba(255, 0, 0, 0.1) 0%,
          rgb(255, 0, 0) ${euiTheme.size.s},
          rgb(255, 0, 0) calc(100% - ${euiTheme.size.s}),
          rgba(255, 0, 0, 0.1) 100%
        );
      `;
    } else if (scrollState?.isScrollableLeft) {
      overflowGradient = `
        mask-image: linear-gradient(
          to right,
          rgba(255, 0, 0, 0.1) 0%,
          rgb(255, 0, 0) ${euiTheme.size.s}
        );
      `;
    } else if (scrollState?.isScrollableRight) {
      overflowGradient = `
        mask-image: linear-gradient(
          to right,
          rgb(255, 0, 0) calc(100% - ${euiTheme.size.s}),
          rgba(255, 0, 0, 0.1) 100%
        );
      `;
    }

    return css`
      overflow-x: auto;
      max-width: 100%;
      user-select: none;
      scrollbar-width: none; // hide the scrollbar
      scroll-behavior: smooth;
      &::-webkit-scrollbar {
        display: none;
      }
      transform: translateZ(0);
      ${overflowGradient}
    `;
  }, [scrollState, euiTheme.size.s]);

  return {
    tabsSizeConfig,
    scrollLeftButton,
    scrollRightButton,
    tabsContainerCss,
  };
};

function calculateScrollState(tabsContainerElement: Element | null): ScrollState | undefined {
  if (tabsContainerElement) {
    const { scrollLeft, scrollWidth, clientWidth } = tabsContainerElement;
    const isScrollableLeft = scrollLeft > 0;
    const isScrollableRight = scrollLeft + clientWidth < scrollWidth;

    return { isScrollableLeft, isScrollableRight };
  }
}
