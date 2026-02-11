/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useMemo } from 'react';

import { EuiPortal, type UseEuiTheme } from '@elastic/eui';
import { ExitFullScreenButton } from '@kbn/shared-ux-button-exit-full-screen';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import { DashboardGrid } from '../grid';
import { DashboardEmptyScreen } from './empty_screen/dashboard_empty_screen';

export const DashboardViewport = () => {
  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();
  const [
    dashboardTitle,
    description,
    expandedPanelId,
    layout,
    viewMode,
    useMargins,
    fullScreenMode,
  ] = useBatchedPublishingSubjects(
    dashboardApi.title$,
    dashboardApi.description$,
    dashboardApi.expandedPanelId$,
    dashboardApi.layout$,
    dashboardApi.viewMode$,
    dashboardApi.settings.useMargins$,
    dashboardApi.fullScreenMode$
  );
  const onExit = useCallback(() => {
    dashboardApi.setFullScreenMode(false);
  }, [dashboardApi]);

  const { panelCount, visiblePanelCount, sectionCount } = useMemo(() => {
    const panels = Object.values(layout.panels);
    const visiblePanels = panels.filter(({ grid }) => {
      return !dashboardInternalApi.isSectionCollapsed(grid.sectionId);
    });
    return {
      panelCount: panels.length,
      visiblePanelCount: visiblePanels.length,
      sectionCount: Object.keys(layout.sections).length,
    };
  }, [layout, dashboardInternalApi]);

  const classes = classNames('dshDashboardViewport', {
    'dshDashboardViewport--empty': panelCount === 0 && sectionCount === 0,
    'dshDashboardViewport--print': viewMode === 'print',
    'dshDashboardViewport--panelExpanded': Boolean(expandedPanelId),
  });

  const styles = useMemoCss(dashboardViewportStyles);

  return (
    <div
      className={classNames('dshDashboardViewportWrapper', {
        'dshDashboardViewportWrapper--defaultBg': !useMargins,
        'dshDashboardViewportWrapper--isFullscreen': fullScreenMode,
      })}
      css={styles.wrapper}
    >
      {fullScreenMode && (
        <EuiPortal>
          <ExitFullScreenButton onExit={onExit} toggleChrome={!dashboardApi.isEmbeddedExternally} />
        </EuiPortal>
      )}
      <div
        className={classes}
        css={styles.viewport}
        data-shared-items-container
        data-title={dashboardTitle}
        data-description={description}
        data-shared-items-count={visiblePanelCount}
        data-test-subj={'dshDashboardViewport'}
      >
        {panelCount === 0 && sectionCount === 0 ? <DashboardEmptyScreen /> : <DashboardGrid />}
      </div>
    </div>
  );
};

const dashboardViewportStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) => ({
    flex: 'auto',
    display: 'flex',
    flexDirection: 'column' as 'column',
    width: '100%',
    '&.dshDashboardViewportWrapper--defaultBg': {
      backgroundColor: euiTheme.colors.emptyShade,
    },
    '.dshDashboardViewport-controls': {
      margin: `0 ${euiTheme.size.s}`,
      paddingTop: euiTheme.size.s,
    },
  }),
  viewport: {
    width: '100%',
    '&.dshDashboardViewport--empty': {
      height: '100%',
    },
    '&.dshDashboardViewport--panelExpanded': {
      flex: 1,
    },
    '&.dshDashboardViewport--print': {
      '.kbnGrid': {
        display: 'block !important',
      },
      '.kbnGridSectionHeader, .kbnGridSectionFooter': {
        display: 'none',
      },
      '.kbnGridPanel': {
        height: '100% !important',
      },
    },
  },
};
