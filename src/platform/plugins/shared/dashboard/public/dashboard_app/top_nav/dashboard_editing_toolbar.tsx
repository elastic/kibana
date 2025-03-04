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
import React, { useState } from 'react';

import { AddFromLibraryButton, Toolbar, ToolbarButton } from '@kbn/shared-ux-button-toolbar';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import useMountedState from 'react-use/lib/useMountedState';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { ControlsToolbarButton } from './controls_toolbar_button';
import { AddPanelButton } from './add_panel_button/components/add_panel_button';
import { addFromLibrary } from '../../dashboard_container/embeddable/api';
import { executeAddLensPanelAction } from '../../dashboard_actions/execute_add_lens_panel_action';

export function DashboardEditingToolbar({ isDisabled }: { isDisabled?: boolean }) {
  const { euiTheme } = useEuiTheme();

  const isMounted = useMountedState();
  const dashboardApi = useDashboardApi();
  const [isLoading, setIsLoading] = useState(false);

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
              isDisabled={isDisabled || isLoading}
              isLoading={isLoading}
              iconType="lensApp"
              size="s"
              onClick={async () => {
                setIsLoading(true);
                await executeAddLensPanelAction(dashboardApi);
                if (isMounted()) {
                  setIsLoading(false);
                }
              }}
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
