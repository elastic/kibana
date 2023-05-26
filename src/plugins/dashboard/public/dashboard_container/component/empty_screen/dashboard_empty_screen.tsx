/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
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
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { METRIC_TYPE } from '@kbn/analytics';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import {
  DEFAULT_PANEL_HEIGHT,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
  DASHBOARD_UI_METRIC_ID,
  DASHBOARD_APP_ID,
} from '../../../dashboard_constants';
import { pluginServices } from '../../../services/plugin_services';
import { emptyScreenStrings } from '../../_dashboard_container_strings';
import { useDashboardContainer } from '../../embeddable/dashboard_container';

export function DashboardEmptyScreen() {
  const {
    settings: {
      theme: { theme$ },
    },
    usageCollection,
    data: { search },
    http: { basePath },
    embeddable: { getStateTransfer },
    dashboardCapabilities: { showWriteControls },
    visualizations: { getAliases: getVisTypeAliases },
  } = pluginServices.getServices();

  const lensAlias = useMemo(
    () => getVisTypeAliases().find(({ name }) => name === 'lens'),
    [getVisTypeAliases]
  );
  const trackUiMetric = usageCollection.reportUiCounter?.bind(
    usageCollection,
    DASHBOARD_UI_METRIC_ID
  );
  const dashboardContainer = useDashboardContainer();
  const isDarkTheme = useObservable(theme$)?.darkMode;
  const isEditMode =
    dashboardContainer.select((state) => state.explicitInput.viewMode) === ViewMode.EDIT;

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = basePath.prepend(
    `/plugins/dashboard/assets/${isDarkTheme ? 'dashboards_dark' : 'dashboards_light'}.svg`
  );

  /**
   * if the Dashboard is in edit mode, we create a fake first panel using the same size as the default panel
   */
  if (isEditMode) {
    const height = Math.round(
      DASHBOARD_GRID_HEIGHT * DEFAULT_PANEL_HEIGHT +
        (DEFAULT_PANEL_HEIGHT - 1) * DASHBOARD_MARGIN_SIZE
    );

    const goToLens = () => {
      if (!lensAlias || !lensAlias.aliasPath) return;

      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, `${lensAlias.name}:create`);
      }
      getStateTransfer().navigateToEditor(lensAlias.aliasApp, {
        path: lensAlias.aliasPath,
        state: {
          originatingApp: DASHBOARD_APP_ID,
          searchSessionId: search.session.getSessionId(),
        },
      });
    };

    const Title = (
      <EuiTitle size="xs">
        <h1>{emptyScreenStrings.getEmptyWidgetTitle()}</h1>
      </EuiTitle>
    );

    const Subtitle = (
      <EuiText size="s" color="subdued">
        <span>{emptyScreenStrings.getEmptyWidgetDescription()}</span>
      </EuiText>
    );

    const Or = (
      <EuiText size="s" color="subdued">
        <span>{emptyScreenStrings.orText()}</span>
      </EuiText>
    );

    const LibraryButton = (
      <EuiButtonEmpty
        flush="left"
        iconType="folderOpen"
        onClick={() => dashboardContainer.addFromLibrary()}
      >
        {emptyScreenStrings.getAddFromLibraryButtonTitle()}
      </EuiButtonEmpty>
    );

    const GoToLensButton = (
      <EuiButton iconType="lensApp" onClick={() => goToLens()}>
        {emptyScreenStrings.getCreateVisualizationButtonTitle()}
      </EuiButton>
    );

    return (
      <EuiPageTemplate style={{ backgroundColor: 'inherit' }} grow={false}>
        <EuiPageTemplate.EmptyPrompt
          color="transparent"
          className="dshEditEmptyWidgetContainer"
          hasBorder={true}
          icon={<EuiImage size="fullWidth" src={imageUrl} alt="" />}
          style={{ padding: euiThemeVars.euiSizeXL }}
          body={Subtitle}
          title={<h2>{Title}</h2>}
          actions={
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>{GoToLensButton}</EuiFlexItem>
              <EuiFlexItem grow={false}>{Or}</EuiFlexItem>
              <EuiFlexItem grow={false}>{LibraryButton}</EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate
      data-test-subj={showWriteControls ? 'dashboardEmptyReadWrite' : 'dashboardEmptyReadOnly'}
      style={{ backgroundColor: 'inherit' }}
      grow={false}
    >
      <EuiPageTemplate.EmptyPrompt style={{ padding: euiThemeVars.euiSizeXXL }}>
        <EuiIcon color="subdued" size="xl" type="visAreaStacked" />
        <EuiSpacer size="m" />
        <EuiText color="default" size="m">
          <p style={{ fontWeight: 'bold' }}>{emptyScreenStrings.getEmptyDashboardTitle()}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="m" color="subdued">
          <p>
            {showWriteControls
              ? emptyScreenStrings.getHowToStartWorkingOnNewDashboardDescription()
              : emptyScreenStrings.getEmptyDashboardAdditionalPrivilege()}
          </p>
        </EuiText>
        {showWriteControls && (
          <>
            <EuiSpacer size="m" />
            <EuiButton
              fill
              iconType="pencil"
              onClick={() => dashboardContainer.dispatch.setViewMode(ViewMode.EDIT)}
            >
              {emptyScreenStrings.getEditLinkTitle()}
            </EuiButton>
          </>
        )}
      </EuiPageTemplate.EmptyPrompt>
    </EuiPageTemplate>
  );
}
