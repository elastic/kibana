/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  EuiIcon,
  EuiText,
  EuiImage,
  EuiButton,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiPageTemplate,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { METRIC_TYPE } from '@kbn/analytics';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import { pluginServices } from '../../../services/plugin_services';
import { emptyScreenStrings } from '../../_dashboard_container_strings';
import { useDashboardContainer } from '../../embeddable/dashboard_container';
import { DASHBOARD_UI_METRIC_ID, DASHBOARD_APP_ID } from '../../../dashboard_constants';

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

  const goToLens = useCallback(() => {
    if (!lensAlias || !lensAlias.aliasPath) return;
    const trackUiMetric = usageCollection.reportUiCounter?.bind(
      usageCollection,
      DASHBOARD_UI_METRIC_ID
    );

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
  }, [getStateTransfer, lensAlias, search.session, usageCollection]);

  const dashboardContainer = useDashboardContainer();
  const isDarkTheme = useObservable(theme$)?.darkMode;
  const isEditMode =
    dashboardContainer.select((state) => state.explicitInput.viewMode) === ViewMode.EDIT;

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = basePath.prepend(
    `/plugins/dashboard/assets/${isDarkTheme ? 'dashboards_dark' : 'dashboards_light'}.svg`
  );

  if (isEditMode) {
    return (
      <EuiPageTemplate
        data-test-subj="emptyDashboardWidget"
        style={{ backgroundColor: 'inherit' }}
        grow={false}
      >
        <EuiPageTemplate.EmptyPrompt
          color="transparent"
          titleSize="xs"
          hasBorder={true}
          className="dshEditEmptyWidgetContainer"
          style={{ padding: euiThemeVars.euiSizeXL }}
          icon={<EuiImage size="fullWidth" src={imageUrl} alt="" />}
          title={<h2>{emptyScreenStrings.getEditModeTitle()}</h2>}
          body={
            <EuiText size="s" color="subdued">
              <span>{emptyScreenStrings.getEditModeSubtitle()}</span>
            </EuiText>
          }
          actions={
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton iconType="lensApp" onClick={() => goToLens()}>
                  {emptyScreenStrings.getCreateVisualizationButtonTitle()}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <span>{emptyScreenStrings.orText()}</span>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  iconType="folderOpen"
                  onClick={() => dashboardContainer.addFromLibrary()}
                >
                  {emptyScreenStrings.getAddFromLibraryButtonTitle()}
                </EuiButtonEmpty>
              </EuiFlexItem>
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
          <p style={{ fontWeight: 'bold' }}>
            {showWriteControls
              ? emptyScreenStrings.getViewModeWithPermissionsTitle()
              : emptyScreenStrings.getViewModeWithoutPermissionsTitle()}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="m" color="subdued">
          <p>
            {showWriteControls
              ? emptyScreenStrings.getViewModeWithPermissionsSubtitle()
              : emptyScreenStrings.getViewModeWithoutPermissionsSubtitle()}
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
