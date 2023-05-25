/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  EuiIcon,
  EuiSpacer,
  EuiPageTemplate,
  EuiImage,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import {
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
  DEFAULT_PANEL_HEIGHT,
} from '../../../dashboard_constants';
import { pluginServices } from '../../../services/plugin_services';
import { emptyScreenStrings } from '../../_dashboard_container_strings';
import { useDashboardContainer } from '../../embeddable/dashboard_container';

export function DashboardEmptyScreen() {
  const {
    dashboardCapabilities: { showWriteControls },
    http: { basePath },
    settings: {
      theme: { theme$ },
    },
  } = pluginServices.getServices();
  const dashboardContainer = useDashboardContainer();
  const isDarkTheme = useObservable(theme$)?.darkMode;
  const isEditMode =
    dashboardContainer.select((state) => state.explicitInput.viewMode) === ViewMode.EDIT;

  /**
   * if the Dashboard is in edit mode, we create a fake first panel using the same size as the default panel
   */
  if (isEditMode) {
    const height = Math.round(
      DASHBOARD_GRID_HEIGHT * DEFAULT_PANEL_HEIGHT +
        (DEFAULT_PANEL_HEIGHT - 1) * DASHBOARD_MARGIN_SIZE
    );
    const width = `calc(50% - ${DASHBOARD_MARGIN_SIZE}px)`;

    return (
      <div
        className="dshEditEmptyWidget"
        data-test-subj="emptyDashboardWidget"
        style={{ margin: DASHBOARD_MARGIN_SIZE, height, width }}
      >
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          justifyContent="center"
          style={{ height: '100%' }}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon color="subdued" size="xl" type="visAreaStacked" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{emptyScreenStrings.getEmptyWidgetTitle()}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <span>{emptyScreenStrings.getEmptyWidgetDescription()}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  const emptyStateGraphicURL = isDarkTheme
    ? '/plugins/home/assets/welcome_graphic_dark_2x.png'
    : '/plugins/home/assets/welcome_graphic_light_2x.png';

  return (
    <EuiPageTemplate
      data-test-subj={showWriteControls ? 'dashboardEmptyReadWrite' : 'dashboardEmptyReadOnly'}
      grow={false}
    >
      <EuiPageTemplate.EmptyPrompt style={{ padding: euiThemeVars.euiSizeXXL }}>
        <EuiImage url={basePath.prepend(emptyStateGraphicURL)} alt="" />
        <EuiText color="default" size="m">
          <p style={{ fontWeight: 'bold' }}>
            {showWriteControls
              ? emptyScreenStrings.getFillDashboardTitle()
              : emptyScreenStrings.getEmptyDashboardTitle()}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText size="m" color="subdued">
          <p>
            {showWriteControls
              ? emptyScreenStrings.getHowToStartWorkingOnNewDashboardDescription()
              : emptyScreenStrings.getEmptyDashboardAdditionalPrivilege()}
          </p>
        </EuiText>
      </EuiPageTemplate.EmptyPrompt>
    </EuiPageTemplate>
  );
}
