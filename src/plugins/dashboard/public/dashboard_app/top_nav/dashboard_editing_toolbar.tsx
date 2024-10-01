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
import { METRIC_TYPE } from '@kbn/analytics';
import React, { useCallback, useMemo } from 'react';

import { AddFromLibraryButton, Toolbar, ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { DASHBOARD_UI_METRIC_ID } from '../../dashboard_constants';
import {
  dataService,
  embeddableService,
  usageCollectionService,
  visualizationsService,
} from '../../services/kibana_services';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { ControlsToolbarButton } from './controls_toolbar_button';
import { EditorMenu } from './editor_menu';

export function DashboardEditingToolbar({ isDisabled }: { isDisabled?: boolean }) {
  const { euiTheme } = useEuiTheme();

  const dashboardApi = useDashboardApi();

  const lensAlias = useMemo(
    () => visualizationsService.getAliases().find(({ name }) => name === 'lens'),
    []
  );

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        const trackUiMetric = usageCollectionService?.reportUiCounter.bind(
          usageCollectionService,
          DASHBOARD_UI_METRIC_ID
        );
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

      const stateTransferService = embeddableService.getStateTransfer();
      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: dashboardApi.getAppContext()?.currentAppId,
          originatingPath: dashboardApi.getAppContext()?.getCurrentPath?.(),
          searchSessionId: dataService.search.session.getSessionId(),
        },
      });
    },
    [dashboardApi]
  );

  /**
   * embeddableFactory: Required, you can get the factory from embeddableStart.getEmbeddableFactory(<embeddable type, i.e. lens>)
   * initialInput: Optional, use it in case you want to pass your own input to the factory
   * dismissNotification: Optional, if not passed a toast will appear in the dashboard
   */

  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const extraButtons = [
    <EditorMenu createNewVisType={createNewVisType} isDisabled={isDisabled} />,
    <AddFromLibraryButton
      onClick={() => dashboardApi.addFromLibrary()}
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
