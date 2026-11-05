/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import React, { useCallback } from 'react';

import { transparentize, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FlexLayout } from '@kbn/grid-layout';
import { FlexLayoutData } from '@kbn/grid-layout/flex/types';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { DashboardLayout } from '../dashboard_api/layout_manager';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../dashboard_api/use_dashboard_internal_api';
import { DASHBOARD_MARGIN_SIZE } from '../dashboard_renderer/grid/constants';
import { PinnedPanel } from './pinned_panel';

export const DashboardPinnedPanelsRenderer = () => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const [flexLayout, viewMode] = useBatchedPublishingSubjects(
    dashboardInternalApi.pinnedLayout$,
    dashboardApi.viewMode$
  );

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const panels = dashboardApi.layout$.getValue().pinnedPanels;
      if (!panels[id]) return;
      const type = panels[id].type;
      return <PinnedPanel id={id} type={type} setDragHandles={setDragHandles} />;
    },
    [dashboardApi.layout$]
  );

  const onLayoutChange = useCallback(
    (newLayout: FlexLayoutData) => {
      if (viewMode !== 'edit') return;

      const currLayout = dashboardApi.layout$.getValue();
      const updatedLayout: DashboardLayout = {
        ...currLayout,
        pinnedPanels: {},
      };
      Object.values(newLayout).forEach((panel) => {
        updatedLayout.pinnedPanels[panel.id] = {
          ...currLayout.pinnedPanels[panel.id],
          order: panel.order,
          width: panel.width,
        };
      });
      console.log({ newLayout, updatedLayout });
      if (!isEqual(currLayout, updatedLayout)) {
        dashboardApi.layout$.next(updatedLayout);
      }
    },
    [dashboardApi.layout$, viewMode]
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
        onLayoutChange={onLayoutChange}
        accessMode={viewMode === 'edit' ? 'EDIT' : 'VIEW'}
      />
    </span>
  );
};

const styles = ({ euiTheme }: UseEuiTheme) => css`
  .kbnFlex {
    padding-top: 0;
  }
  .kbnFlexPanel--dragPreview,
  .kbnFlexSection--dragPreview {
    border-radius: ${euiTheme.border.radius.control} ${euiTheme.border.radius.control};

    background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
  }
`;
