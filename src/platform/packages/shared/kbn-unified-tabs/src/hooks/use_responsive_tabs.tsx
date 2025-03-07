/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonIcon, useResizeObserver } from '@elastic/eui';
import { throttle } from 'lodash';
import { i18n } from '@kbn/i18n';
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

  return {
    tabsSizeConfig,
    scrollLeftButton,
    scrollRightButton,
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
