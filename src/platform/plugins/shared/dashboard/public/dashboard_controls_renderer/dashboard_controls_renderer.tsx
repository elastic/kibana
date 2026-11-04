/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { DefaultEmbeddableApi, EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { FlexLayout } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useCallback, useRef, useState } from 'react';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../dashboard_api/use_dashboard_internal_api';
import {
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
  DEFAULT_DASHBOARD_DRAG_TOP_OFFSET,
} from '../dashboard_renderer/grid/constants';
import { PinnedPanelRenderer } from './pinned_panel_renderer';

export const DashboardPinnedPanelsRenderer = () => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();
  const [topOffset, setTopOffset] = useState(DEFAULT_DASHBOARD_DRAG_TOP_OFFSET);
  const embeddableApiRef = useRef<DefaultEmbeddableApi | null>(null);

  const [flexLayout] = useBatchedPublishingSubjects(dashboardInternalApi.pinnedLayout$);
  console.log({ flexLayout });

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const panels = dashboardApi.layout$.getValue().pinnedPanels;
      if (!panels[id]) return;
      const type = panels[id].type;
      return <PinnedPanelRenderer id={id} type={type} setDragHandles={setDragHandles} />;
    },
    [dashboardApi.layout$]
  );

  return (
    <span css={styles}>
      <FlexLayout
        layout={flexLayout}
        gridSettings={{
          gutterSize: DASHBOARD_MARGIN_SIZE,
          rowHeight: 32,
          columnCount: 12,
          keyboardDragTopLimit: 0,
        }}
        useCustomDragHandle={true}
        renderPanelContents={renderPanelContents}
        onLayoutChange={() => {}}
        accessMode={'EDIT'}
      />
    </span>
  );
};

const styles = ({ euiTheme }: UseEuiTheme) => css`
  .kbnGridPanel--dragPreview,
  .kbnGridSection--dragPreview {
    border-radius: ${euiTheme.border.radius.control} ${euiTheme.border.radius.control};

    background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
  }
`;
