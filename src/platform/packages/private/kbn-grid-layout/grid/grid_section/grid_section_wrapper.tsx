/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';

import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';

export interface GridSectionProps {
  sectionId: string;
}

/**
 * This component "wraps" all the panels in a given section and it is used to:
 * 1. Apply styling to a targeted section via the `kbnGridSection--targeted` class name
 * 2. Apply styling to sections where dropping is blocked via the `kbnGridSection--blocked` class name
 * 3. The ref to this component is used to figure out which section is being targeted
 */
export const GridSectionWrapper = React.memo(({ sectionId }: GridSectionProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const styles = useMemo(() => {
    return css({
      gridColumn: `1 / -1`,
      gridRowStart: `start-${sectionId}`,
      gridRowEnd: `end-${sectionId}`,
    });
  }, [sectionId]);

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.sectionRefs.current[sectionId];
    };
  }, [sectionId, gridLayoutStateManager]);

  useEffect(
    () => {
      /** Update the styles of the grid row via a subscription to prevent re-renders */
      const panelInteractionStyleSubscription = gridLayoutStateManager.activePanelEvent$.subscribe(
        (activePanel) => {
          const rowRef = gridLayoutStateManager.sectionRefs.current[sectionId];
          if (!rowRef) return;
          const targetSection = activePanel?.targetSection;
          if (sectionId === targetSection && activePanel) {
            rowRef.classList.add('kbnGridSection--targeted');
          } else {
            rowRef.classList.remove('kbnGridSection--targeted');
          }
        }
      );

      const sectionInteractionStyleSubscription =
        gridLayoutStateManager.activeSectionEvent$.subscribe((activeSection) => {
          const rowRef = gridLayoutStateManager.sectionRefs.current[sectionId];
          if (!rowRef) return;
          const targetSection = activeSection?.targetSection;
          const layout = gridLayoutStateManager.gridLayout$.getValue();
          if (sectionId === targetSection && !layout[sectionId].isMainSection) {
            rowRef.classList.add('kbnGridSection--blocked');
          } else {
            rowRef.classList.remove('kbnGridSection--blocked');
          }
        });

      return () => {
        panelInteractionStyleSubscription.unsubscribe();
        sectionInteractionStyleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionId]
  );

  return (
    <span
      css={styles}
      ref={(rowRef: HTMLDivElement | null) => {
        gridLayoutStateManager.sectionRefs.current[sectionId] = rowRef;
      }}
      className={'kbnGridSection'}
      data-test-subj={`kbnGridSectionWrapper-${sectionId}`}
    />
  );
});

GridSectionWrapper.displayName = 'KbnGridLayoutSectionwWrapper';
