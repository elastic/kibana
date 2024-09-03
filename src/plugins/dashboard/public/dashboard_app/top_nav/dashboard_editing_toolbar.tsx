/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { useEuiTheme } from '@elastic/eui';

import { AddFromLibraryButton, Toolbar, ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { EditorMenu } from './editor_menu';
import { useDashboardAPI } from '../dashboard_app';
import { pluginServices } from '../../services/plugin_services';
import { ControlsToolbarButton } from './controls_toolbar_button';
import { DASHBOARD_UI_METRIC_ID } from '../../dashboard_constants';

export function DashboardEditingToolbar({ isDisabled }: { isDisabled?: boolean }) {
  const {
    usageCollection,
    data: { search },
    embeddable: { getStateTransfer },
    visualizations: { getAliases: getVisTypeAliases },
  } = pluginServices.getServices();
  const { euiTheme } = useEuiTheme();

  const dashboard = useDashboardAPI();

  const stateTransferService = getStateTransfer();

  const lensAlias = getVisTypeAliases().find(({ name }) => name === 'lens');

  const trackUiMetric = usageCollection.reportUiCounter?.bind(
    usageCollection,
    DASHBOARD_UI_METRIC_ID
  );

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        if (trackUiMetric) {
          trackUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
        }

        if (!('alias' in visType)) {
          // this visualization is not an alias
          appId = 'visualize';
          path = `#/create?type=${encodeURIComponent(visType.name)}`;
        } else if (visType.alias && 'path' in visType.alias) {
          // this visualization **is** an alias, and it has an app to redirect to for creation
          appId = visType.alias.app;
          path = visType.alias.path;
        }
      } else {
        appId = 'visualize';
        path = '#/create?';
      }

      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: dashboard.getAppContext()?.currentAppId,
          originatingPath: dashboard.getAppContext()?.getCurrentPath?.(),
          searchSessionId: search.session.getSessionId(),
        },
      });
    },
    [stateTransferService, dashboard, search.session, trackUiMetric]
  );

  /**
   * embeddableFactory: Required, you can get the factory from embeddableStart.getEmbeddableFactory(<embeddable type, i.e. lens>)
   * initialInput: Optional, use it in case you want to pass your own input to the factory
   * dismissNotification: Optional, if not passed a toast will appear in the dashboard
   */

  const controlGroupApi = useStateFromPublishingSubject(dashboard.controlGroupApi$);
  const extraButtons = [
    <EditorMenu createNewVisType={createNewVisType} isDisabled={isDisabled} api={dashboard} />,
    <AddFromLibraryButton
      onClick={() => dashboard.addFromLibrary()}
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
              onClick={createNewVisType(lensAlias)}
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
