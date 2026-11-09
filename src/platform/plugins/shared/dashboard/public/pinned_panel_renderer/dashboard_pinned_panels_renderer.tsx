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

import type { UseEuiTheme } from '@elastic/eui';
import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { FlexLayout } from '@kbn/grid-layout';
import type { FlexLayoutData } from '@kbn/grid-layout';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import type { DashboardLayout } from '../dashboard_api/layout_manager';
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
      if (!isEqual(currLayout, updatedLayout)) {
        dashboardApi.layout$.next(updatedLayout);
      }
    },
    [dashboardApi.layout$, viewMode]
  );
  return (
    <span css={[styles, Object.keys(flexLayout).length === 0 ? emptyStyles : undefined]}>
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

const emptyStyles = css`
  display: none;
`;

const styles = ({ euiTheme }: UseEuiTheme) => css`
  --dashboardActivePanelBorderStyle: ${euiTheme.border.width.thick} solid
    ${euiTheme.colors.vis.euiColorVis0};

  .kbnFlex {
    padding-top: 0;
  }
  .kbnFlexPanel--dragPreview,
  .kbnFlexSection--dragPreview {
    border-radius: ${euiTheme.border.radius.control} ${euiTheme.border.radius.control};
    background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
  }

  .kbnFlexPanel--active {
    outline: var(--dashboardActivePanelBorderStyle);
    border-radius: ${euiTheme.border.radius.control} ${euiTheme.border.radius.control};
  }

  .kbnFlexPanel--resizeHandle {
    height: 100%;
    width: ${euiTheme.size.m};
    right: 1px;
    top: 2px;
    &:hover {
      border-radius: 0 ${euiTheme.border.radius.control} ${euiTheme.border.radius.control} 0;
      border: var(--dashboardActivePanelBorderStyle);
      border-left: none;
    }
  }

  // styles for the panel grid size gauge that appears when resizing
  .kbnFlexPanel--resizeGauge {
    padding: ${euiTheme.size.xs};
    z-index: ${euiTheme.levels.menu};
    border-top-right-radius: ${euiTheme.border.radius.control};
    height: 100%;
    display: flex;
    align-items: center;

    & .kbnFlexPanel--resizeGauge--inner {
      padding: ${euiTheme.size.xxs} ${euiTheme.size.xs};
      height: ${euiTheme.size.l};
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: ${euiTheme.colors.backgroundLightAccentSecondary};
      border-radius: ${euiTheme.border.radius.control};
    }

    & .kbnFlexPanel--resizeGauge--text {
      font-weight: ${euiTheme.font.weight.medium};
      color: ${euiTheme.colors.textAccentSecondary};
    }
  }
`;
