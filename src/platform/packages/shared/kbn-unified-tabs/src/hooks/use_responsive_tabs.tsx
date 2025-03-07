/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, useResizeObserver } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TabItem } from '../types';
import { calculateResponsiveTabs } from '../utils/calculate_responsive_tabs';

const SCROLL_STEP = 200;

export interface UseResponsiveTabsProps {
  items: TabItem[];
  hasReachedMaxItemsCount: boolean;
  tabsContainerWithPlus: Element | null;
  tabsContainerRef: React.RefObject<HTMLDivElement>;
}

export const useResponsiveTabs = ({
  items,
  hasReachedMaxItemsCount,
  tabsContainerWithPlus,
  tabsContainerRef,
}: UseResponsiveTabsProps) => {
  const dimensions = useResizeObserver(tabsContainerWithPlus);
  const tabsSizeConfig = useMemo(
    () =>
      calculateResponsiveTabs({ items, containerWidth: dimensions.width, hasReachedMaxItemsCount }),
    [items, dimensions.width, hasReachedMaxItemsCount]
  );

  const scrollLeftButtonLabel = i18n.translate('unifiedTabs.scrollLeftButton', {
    defaultMessage: 'Scroll left',
  });

  const scrollRightButtonLabel = i18n.translate('unifiedTabs.scrollRightButton', {
    defaultMessage: 'Scroll right',
  });

  const scrollLeft = useCallback(() => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollLeft = Math.max(
        tabsContainerRef.current.scrollLeft - SCROLL_STEP,
        0
      );
    }
  }, [tabsContainerRef]);

  const scrollRight = useCallback(() => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollLeft = Math.min(
        tabsContainerRef.current.scrollLeft + SCROLL_STEP,
        tabsContainerRef.current.scrollWidth
      );
    }
  }, [tabsContainerRef]);

  const scrollLeftButton = useMemo(
    () =>
      tabsSizeConfig.isScrollable ? (
        <EuiButtonIcon
          data-test-subj="unifiedTabs_tabsBar_scrollLeftBtn"
          iconType="arrowLeft"
          color="text"
          aria-label={scrollLeftButtonLabel}
          title={scrollLeftButtonLabel}
          onClick={scrollLeft}
        />
      ) : null,
    [scrollLeftButtonLabel, scrollLeft, tabsSizeConfig.isScrollable]
  );

  const scrollRightButton = useMemo(
    () =>
      tabsSizeConfig.isScrollable ? (
        <EuiButtonIcon
          data-test-subj="unifiedTabs_tabsBar_scrollRightBtn"
          iconType="arrowRight"
          color="text"
          aria-label={scrollRightButtonLabel}
          title={scrollRightButtonLabel}
          onClick={scrollRight}
        />
      ) : null,
    [scrollRightButtonLabel, scrollRight, tabsSizeConfig.isScrollable]
  );

  return {
    tabsSizeConfig,
    scrollLeftButton,
    scrollRightButton,
  };
};
