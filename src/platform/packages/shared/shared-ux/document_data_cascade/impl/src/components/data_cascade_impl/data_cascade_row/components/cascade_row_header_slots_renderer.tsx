/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiButtonIcon, EuiPanel } from '@elastic/eui';
import { useScrollSync } from '../../../helpers/scroll_sync';
import { useStyles as useCascadeRowHeaderSlotsRendererStyles } from './cascade_row_header_slots_renderer.styles';

const SCROLL_STEP = 150;

interface CascadeRowHeaderSlotsRendererProps {
  headerMetaSlots: React.ReactNode[];
}

const CascadeRowHeaderSlotsRenderer = ({ headerMetaSlots }: CascadeRowHeaderSlotsRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollSync = useScrollSync();

  const [scrollState, setScrollState] = useState(() => scrollSync.getScrollState());

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) {
      scrollSync.register(el);
      return () => scrollSync.unregister(el);
    }
  }, [scrollSync]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      scrollSync.syncScroll(containerRef.current);
      setScrollState(scrollSync.getScrollState());
    }
  }, [scrollSync]);

  const handleMouseEnter = useCallback(() => {
    if (containerRef.current) {
      scrollSync.notifyHover(containerRef.current);
      setScrollState(scrollSync.getScrollState());
    }
  }, [scrollSync]);

  const handleMouseLeave = useCallback(() => {
    if (containerRef.current) {
      scrollSync.notifyHoverEnd(containerRef.current);
    }
  }, [scrollSync]);

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

  const styles = useCascadeRowHeaderSlotsRendererStyles();

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
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      css={styles.slotsContainerWrapper}
      data-scrollable={String(scrollState.isScrollable)}
      data-can-scroll-left={String(scrollState.canScrollLeft)}
      data-can-scroll-right={String(scrollState.canScrollRight)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <EuiPanel grow={false} paddingSize="none" css={styles.slotsLeftScrollButton}>
        <EuiButtonIcon
          iconType="arrowLeft"
          color="text"
          size="xs"
          aria-label={scrollLeftLabel}
          onClick={scrollLeft}
          data-test-subj="cascadeHeaderSlots-scrollLeft"
          display="empty"
        />
      </EuiPanel>
      <EuiFlexItem
        grow
        ref={containerRef}
        onScroll={handleScroll}
        css={styles.slotsContainer}
        tabIndex={0}
      >
        <EuiFlexGroup
          css={styles.slotsContainerInner}
          gutterSize="s"
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
      <EuiPanel grow={false} paddingSize="none" css={styles.slotsRightScrollButton}>
        <EuiButtonIcon
          iconType="arrowRight"
          color="text"
          size="xs"
          aria-label={scrollRightLabel}
          onClick={scrollRight}
          data-test-subj="cascadeHeaderSlots-scrollRight"
          display="empty"
        />
      </EuiPanel>
    </EuiFlexGroup>
  );
};

export { CascadeRowHeaderSlotsRenderer };
