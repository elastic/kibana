/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';

import { AddFromLibraryButton, Toolbar, ToolbarButton } from '@kbn/shared-ux-button-toolbar';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { visualizationsService } from '../../services/kibana_services';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { ControlsToolbarButton } from './controls_toolbar_button';
import { AddPanelButton } from './add_panel_button/components/add_panel_button';
import { addFromLibrary } from '../../dashboard_container/embeddable/api';
import { navigateToVisEditor } from './add_panel_button/navigate_to_vis_editor';

export function DashboardEditingToolbar({ isDisabled }: { isDisabled?: boolean }) {
  const { euiTheme } = useEuiTheme();

  const dashboardApi = useDashboardApi();

  const navigateToDefaultEditor = useCallback(() => {
    const lensAlias = visualizationsService.getAliases().find(({ name }) => name === 'lens');
    navigateToVisEditor(dashboardApi, lensAlias);
  }, [dashboardApi]);

  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const extraButtons = [
    <AddPanelButton isDisabled={isDisabled} />,
    <AddFromLibraryButton
      onClick={() => addFromLibrary(dashboardApi)}
      size="s"
      data-test-subj="dashboardAddFromLibraryButton"
      isDisabled={isDisabled}
    />,
    <ControlsToolbarButton isDisabled={isDisabled} controlGroupApi={controlGroupApi} />,
  ];

  return (
    <div
      css={css`
        padding: 0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s};
      `}
    >
      <Toolbar>
        {{
          primaryButton: (
            <ToolbarButton
              type="primary"
              isDisabled={isDisabled}
              iconType="lensApp"
              size="s"
              onClick={navigateToDefaultEditor}
              label={getCreateVisualizationButtonTitle()}
              data-test-subj="dashboardAddNewPanelButton"
            />
          ),
          extraButtons,
        }}
      </Toolbar>
    </div>
  );
}
