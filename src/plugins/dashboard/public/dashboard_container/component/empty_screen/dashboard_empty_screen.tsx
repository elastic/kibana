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
  EuiText,
  EuiImage,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiPageTemplate,
} from '@elastic/eui';
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

  // If the user ends up in edit mode without write privileges, we shouldn't show the edit prompt.
  const showEditPrompt = showWriteControls && isEditMode;

  const emptyPromptTestSubject = (() => {
    if (showEditPrompt) return 'emptyDashboardWidget';
    return showWriteControls ? 'dashboardEmptyReadWrite' : 'dashboardEmptyReadOnly';
  })();

  const title = (() => {
    const titleString = showEditPrompt
      ? emptyScreenStrings.getEditModeTitle()
      : showWriteControls
      ? emptyScreenStrings.getViewModeWithPermissionsTitle()
      : emptyScreenStrings.getViewModeWithoutPermissionsTitle();
    return <h2>{titleString}</h2>;
  })();

  const body = (() => {
    const bodyString = showEditPrompt
      ? emptyScreenStrings.getEditModeSubtitle()
      : showWriteControls
      ? emptyScreenStrings.getViewModeWithPermissionsSubtitle()
      : emptyScreenStrings.getViewModeWithoutPermissionsSubtitle();
    return (
      <EuiText size="s" color="subdued">
        <span>{bodyString}</span>
      </EuiText>
    );
  })();

  const actions = (() => {
    if (showEditPrompt) {
      return (
        <EuiFlexGroup justifyContent="center" gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="lensApp" onClick={() => goToLens()}>
              {emptyScreenStrings.getCreateVisualizationButtonTitle()}
            </EuiButton>
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
      );
    }
    if (showWriteControls) {
      return (
        <EuiButton
          iconType="pencil"
          onClick={() => dashboardContainer.dispatch.setViewMode(ViewMode.EDIT)}
        >
          {emptyScreenStrings.getEditLinkTitle()}
        </EuiButton>
      );
    }
  })();

  return (
    <div className="dshEmptyPromptParent">
      <EuiPageTemplate
        grow={false}
        data-test-subj={emptyPromptTestSubject}
        className="dshEmptyPromptPageTemplate"
      >
        <EuiPageTemplate.EmptyPrompt
          icon={<EuiImage size="fullWidth" src={imageUrl} alt="" />}
          title={title}
          body={body}
          actions={actions}
          titleSize="xs"
          color="transparent"
          className="dshEmptyWidgetContainer"
        />
      </EuiPageTemplate>
    </div>
  );
}
