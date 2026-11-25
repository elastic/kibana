/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram';
import { type DropType, DropOverlayWrapper, Droppable } from '@kbn/dom-drag-drop';
import { i18n } from '@kbn/i18n';
import { OutPortal } from 'react-reverse-portal';
import { PanelsToggle } from '../../../../components/panels_toggle';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import {
  DEFAULT_HISTOGRAM_KEY_PREFIX,
  useCurrentChartPortalNode,
  useCurrentTabRuntimeState,
  useAppStateSelector,
} from '../../state_management/redux';

const CHART_DROP_PROPS = {
  value: {
    id: 'dscDropZoneChart',
    humanData: {
      label: i18n.translate('discover.dropZoneChartLabel', {
        defaultMessage: 'Drop zone to use field as a breakdown in the chart',
      }),
    },
  },
  // Keyboard drag and drop order; must be unique, placed after the table's [1, 0, 0, 0] so it is reached second
  order: [2, 0, 0, 0],
  types: ['field_add'] as DropType[],
};

const CHART_DROP_OVERLAY_PROPS = { 'data-test-subj': 'dscChartDropOverlay' };

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  onDropFieldToChart?: () => void;
}

export const DiscoverHistogramLayout = ({
  onDropFieldToChart,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const chartPortalNode = useCurrentChartPortalNode();
  const { localStorageKeyPrefix, layoutPropsMap } = useCurrentTabRuntimeState(
    (tab) => tab.unifiedHistogramConfig$
  );
  const layoutProps = layoutPropsMap[localStorageKeyPrefix ?? DEFAULT_HISTOGRAM_KEY_PREFIX];
  const isMainPanelHidden = useAppStateSelector((state) => Boolean(state.hideTable));
  const panelsToggle = useMemo(() => <PanelsToggle dataTestSubjSuffix="InHistogram" />, []);

  if (!layoutProps) {
    return null;
  }

  const isChartDropAllowed = Boolean(
    onDropFieldToChart && layoutProps.chart && !layoutProps.chart.hidden
  );

  return (
    <UnifiedHistogramLayout
      unifiedHistogramChart={
        chartPortalNode ? (
          <Droppable
            dropTypes={isChartDropAllowed ? CHART_DROP_PROPS.types : undefined}
            value={CHART_DROP_PROPS.value}
            order={CHART_DROP_PROPS.order}
            onDrop={onDropFieldToChart}
          >
            <DropOverlayWrapper
              isVisible={isChartDropAllowed}
              overlayProps={CHART_DROP_OVERLAY_PROPS}
            >
              <OutPortal node={chartPortalNode} panelsToggle={panelsToggle} />
            </DropOverlayWrapper>
          </Droppable>
        ) : null
      }
      isMainPanelHidden={isMainPanelHidden}
      {...layoutProps}
    >
      <DiscoverMainContent {...mainContentProps} />
    </UnifiedHistogramLayout>
  );
};
