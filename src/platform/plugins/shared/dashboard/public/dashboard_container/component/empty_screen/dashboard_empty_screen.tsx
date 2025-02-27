/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import useMountedState from 'react-use/lib/useMountedState';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { addFromLibrary } from '../../embeddable/api';
import { executeAddLensPanelAction } from '../../../dashboard_actions/execute_add_lens_panel_action';

export function DashboardEmptyScreen() {
  const { showWriteControls } = useMemo(() => {
    return getDashboardCapabilities();
  }, []);

  const isMounted = useMountedState();
  const dashboardApi = useDashboardApi();
  const [isLoading, setIsLoading] = useState(false);
  const isDarkTheme = useObservable(coreServices.theme.theme$)?.darkMode;
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);
  const isEditMode = useMemo(() => {
    return viewMode === 'edit';
  }, [viewMode]);

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = coreServices.http.basePath.prepend(
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
      ? i18n.translate('dashboard.emptyScreen.editModeTitle', {
          defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
        })
      : showWriteControls
      ? i18n.translate('dashboard.emptyScreen.viewModeTitle', {
          defaultMessage: 'Add visualizations to your dashboard',
        })
      : i18n.translate('dashboard.emptyScreen.noPermissionsTitle', {
          defaultMessage: 'This dashboard is empty.',
        });
    return <h2>{titleString}</h2>;
  })();

  const body = (() => {
    const bodyString = showEditPrompt
      ? i18n.translate('dashboard.emptyScreen.editModeSubtitle', {
          defaultMessage: 'Create a visualization of your data, or add one from the library.',
        })
      : showWriteControls
      ? i18n.translate('dashboard.emptyScreen.viewModeSubtitle', {
          defaultMessage: 'Enter edit mode, and then start adding your visualizations.',
        })
      : i18n.translate('dashboard.emptyScreen.noPermissionsSubtitle', {
          defaultMessage: 'You need additional privileges to edit this dashboard.',
        });
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
            <EuiButton
              isLoading={isLoading}
              iconType="lensApp"
              onClick={async () => {
                setIsLoading(true);
                await executeAddLensPanelAction(dashboardApi);
                if (isMounted()) {
                  setIsLoading(false);
                }
              }}
            >
              {i18n.translate('dashboard.emptyScreen.createVisualization', {
                defaultMessage: 'Create visualization',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              iconType="folderOpen"
              onClick={() => addFromLibrary(dashboardApi)}
            >
              {i18n.translate('dashboard.emptyScreen.addFromLibrary', {
                defaultMessage: 'Add from library',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (showWriteControls) {
      return (
        <EuiButton iconType="pencil" onClick={() => dashboardApi.setViewMode('edit')}>
          {i18n.translate('dashboard.emptyScreen.editDashboard', {
            defaultMessage: 'Edit dashboard',
          })}
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
