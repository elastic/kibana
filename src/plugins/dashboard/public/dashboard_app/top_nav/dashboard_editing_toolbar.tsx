/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
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
import { dashboardReplacePanelActionStrings } from '../../dashboard_actions/_dashboard_actions_strings';
import { DASHBOARD_APP_ID, DASHBOARD_UI_METRIC_ID } from '../../dashboard_constants';
import { useDashboardContainerContext } from '../../dashboard_container/dashboard_container_renderer';
import { pluginServices } from '../../services/plugin_services';
import { getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { EditorMenu } from './editor_menu';
import { ControlsToolbarButton } from './controls_toolbar_button';

export function DashboardEditingToolbar() {
  const {
    usageCollection,
    data: { search },
    notifications: { toasts },
    settings: { uiSettings },
    embeddable: { getStateTransfer, getEmbeddableFactory },
    visualizations: { get: getVisualization, getAliases: getVisTypeAliases },
  } = pluginServices.getServices();

  const { embeddableInstance: dashboardContainer } = useDashboardContainerContext();

  const stateTransferService = getStateTransfer();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const lensAlias = getVisTypeAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes: Array<
    { type: 'vis'; visType: string } | { type: 'embeddable'; embeddableType: string }
  > = [
    { type: 'vis', visType: 'markdown' },
    { type: 'embeddable', embeddableType: 'image' },
    { type: 'vis', visType: 'maps' },
  ];

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

  const createNewEmbeddable = useCallback(
    async (embeddableFactory: EmbeddableFactory) => {
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, embeddableFactory.type);
      }

      let explicitInput: Awaited<ReturnType<typeof embeddableFactory.getExplicitInput>>;
      try {
        explicitInput = await embeddableFactory.getExplicitInput();
      } catch (e) {
        // error likely means user canceled embeddable creation
        return;
      }

      const newEmbeddable = await dashboardContainer.addNewEmbeddable(
        embeddableFactory.type,
        explicitInput
      );

      if (newEmbeddable) {
        toasts.addSuccess({
          title: dashboardReplacePanelActionStrings.getSuccessMessage(newEmbeddable.getTitle()),
          'data-test-subj': 'addEmbeddableToDashboardSuccess',
        });
      }
    },
    [trackUiMetric, dashboardContainer, toasts]
  );

  const getVisTypeQuickButton = (quickButtonForType: typeof quickButtonVisTypes[0]) => {
    if (quickButtonForType.type === 'vis') {
      const visTypeName = quickButtonForType.visType;
      const visType =
        getVisualization(visTypeName) ||
        getVisTypeAliases().find(({ name }) => name === visTypeName);

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
    } else {
      const embeddableType = quickButtonForType.embeddableType;
      const embeddableFactory = getEmbeddableFactory(embeddableType);
      return {
        iconType: embeddableFactory?.getIconType(),
        createType: embeddableFactory?.getDisplayName(),
        onClick: () => {
          if (embeddableFactory) {
            createNewEmbeddable(embeddableFactory);
          }
        },
        'data-test-subj': `dashboardQuickButton${embeddableType}`,
      };
    }
  };

  const quickButtons = quickButtonVisTypes
    .map(getVisTypeQuickButton)
    .filter((button) => button) as QuickButtonProps[];

  const extraButtons = [
    <EditorMenu createNewVisType={createNewVisType} createNewEmbeddable={createNewEmbeddable} />,
    <AddFromLibraryButton
      onClick={() => dashboardContainer.addFromLibrary()}
      data-test-subj="dashboardAddPanelButton"
    />,
  ];
  if (dashboardContainer.controlGroup) {
    extraButtons.push(<ControlsToolbarButton controlGroup={dashboardContainer.controlGroup} />);
  }

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
          extraButtons,
        }}
      </SolutionToolbar>
    </>
  );
}
