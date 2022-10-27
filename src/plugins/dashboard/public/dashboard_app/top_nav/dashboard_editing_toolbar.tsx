/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  AddFromLibraryButton,
  PrimaryActionButton,
  QuickButtonGroup,
  QuickButtonProps,
  SolutionToolbar,
} from '@kbn/presentation-util-plugin/public';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import React from 'react';
import { useCallback } from 'react';
import { DASHBOARD_APP_ID, DASHBOARD_UI_METRIC_ID } from '../../dashboard_constants';
import { useDashboardContainerContext } from '../../dashboard_container/dashboard_container_renderer';
import { pluginServices } from '../../services/plugin_services';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { EditorMenu } from './editor_menu';

export function DashboardEditingToolbar() {
  const {
    usageCollection,
    data: { search },
    settings: { uiSettings },
    embeddable: { getStateTransfer },
    visualizations: { get: getVisualization, getAliases: getVisTypeAliases },
  } = pluginServices.getServices();

  const { embeddableInstance: dashboardContainer } = useDashboardContainerContext();

  const stateTransferService = getStateTransfer();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const lensAlias = getVisTypeAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes = ['markdown', 'maps'];

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

        if ('aliasPath' in visType) {
          appId = visType.aliasApp;
          path = visType.aliasPath;
        } else {
          appId = 'visualize';
          path = `#/create?type=${encodeURIComponent(visType.name)}`;
        }
      } else {
        appId = 'visualize';
        path = '#/create?';
      }

      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: DASHBOARD_APP_ID,
          searchSessionId: search.session.getSessionId(),
        },
      });
    },
    [stateTransferService, search.session, trackUiMetric]
  );

  const getVisTypeQuickButton = (visTypeName: string) => {
    const visType =
      getVisualization(visTypeName) || getVisTypeAliases().find(({ name }) => name === visTypeName);

    if (visType) {
      if ('aliasPath' in visType) {
        const { name, icon, title } = visType as VisTypeAlias;

        return {
          iconType: icon,
          createType: title,
          onClick: createNewVisType(visType as VisTypeAlias),
          'data-test-subj': `dashboardQuickButton${name}`,
        };
      } else {
        const { name, icon, title, titleInWizard } = visType as BaseVisType;

        return {
          iconType: icon,
          createType: titleInWizard || title,
          onClick: createNewVisType(visType as BaseVisType),
          'data-test-subj': `dashboardQuickButton${name}`,
        };
      }
    }
    return;
  };

  const quickButtons = quickButtonVisTypes
    .map(getVisTypeQuickButton)
    .filter((button) => button) as QuickButtonProps[];

  return (
    <>
      <EuiHorizontalRule margin="none" />
      <SolutionToolbar isDarkModeEnabled={IS_DARK_THEME}>
        {{
          primaryActionButton: (
            <PrimaryActionButton
              isDarkModeEnabled={IS_DARK_THEME}
              label={getCreateVisualizationButtonTitle()}
              onClick={createNewVisType(lensAlias)}
              iconType="lensApp"
              data-test-subj="dashboardAddNewPanelButton"
            />
          ),
          quickButtonGroup: <QuickButtonGroup buttons={quickButtons} />,
          extraButtons: [
            <EditorMenu createNewVisType={createNewVisType} />,
            <AddFromLibraryButton
              onClick={() => dashboardContainer.addFromLibrary()}
              data-test-subj="dashboardAddPanelButton"
            />,
            // dashboardAppState.dashboardContainer.controlGroup?.getToolbarButtons(),
          ],
        }}
      </SolutionToolbar>
    </>
  );
}
