/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { type CascadeSizing } from '../../types';
import {
  styles as cascadeRowHeaderSlotsRendererStyles,
  type ScrollState,
} from './cascade_row_header_slots_renderer.styles';

const SCROLL_STEP = 150;

const calculateScrollState = (element: HTMLDivElement | null): ScrollState => {
  if (!element) {
    return { isScrollable: false, canScrollLeft: false, canScrollRight: false };
  }
  const { scrollLeft, scrollWidth, clientWidth } = element;

  const isScrollable = scrollWidth > clientWidth;
  return {
    isScrollable,
    canScrollLeft: scrollLeft > 0,
    canScrollRight: scrollLeft + clientWidth < scrollWidth - 1, // -1 for rounding tolerance
  };
};

const CascadeRowHeaderSlotsRenderer = ({
  headerMetaSlots,
  size,
}: {
  headerMetaSlots: React.ReactNode[];
  size: CascadeSizing;
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    isScrollable: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const styles = useMemo(
    () => cascadeRowHeaderSlotsRendererStyles(euiTheme, scrollState),
    [euiTheme, scrollState]
  );

  const updateScrollState = useCallback(() => {
    setScrollState(calculateScrollState(containerRef.current));
  }, []);

  // Update scroll state on mount and when slots change
  useEffect(() => {
    updateScrollState();

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updateScrollState);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [updateScrollState, headerMetaSlots]);

  const handleScroll = useCallback(() => {
    updateScrollState();
  }, [updateScrollState]);

  const scrollLeft = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = Math.max(containerRef.current.scrollLeft - SCROLL_STEP, 0);
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = Math.min(
        containerRef.current.scrollLeft + SCROLL_STEP,
        containerRef.current.scrollWidth
      );
    }
  }, []);

  const scrollLeftLabel = i18n.translate(
    'sharedUXPackages.dataCascade.headerSlots.scrollLeftLabel',
    { defaultMessage: 'Scroll left' }
  );

  const scrollRightLabel = i18n.translate(
    'sharedUXPackages.dataCascade.headerSlots.scrollRightLabel',
    { defaultMessage: 'Scroll right' }
  );

  if (!headerMetaSlots?.length) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow ref={containerRef} onScroll={handleScroll} css={styles.slotsContainer}>
        <EuiFlexGroup
          css={styles.slotsContainerInner}
          gutterSize={size}
          justifyContent="flexEnd"
          wrap={false}
          responsive={false}
        >
          {headerMetaSlots.map((metaSlot, index) => (
            <EuiFlexItem key={index} grow={false} css={styles.slotItemWrapper}>
              {metaSlot}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      {scrollState.isScrollable && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowLeft"
            color="text"
            size="xs"
            disabled={!scrollState.canScrollLeft}
            aria-label={scrollLeftLabel}
            onClick={scrollLeft}
            data-test-subj="cascadeHeaderSlots-scrollLeft"
          />
        </EuiFlexItem>
      )}
      {scrollState.isScrollable && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowRight"
            color="text"
            size="xs"
            disabled={!scrollState.canScrollRight}
            aria-label={scrollRightLabel}
            onClick={scrollRight}
            data-test-subj="cascadeHeaderSlots-scrollRight"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export { CascadeRowHeaderSlotsRenderer };
