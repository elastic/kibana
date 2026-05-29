/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPageTemplate,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { useFeaturedItems } from '../../../dashboard_app/top_nav/add_panel_button/use_featured_items';

const customTitles: Record<string, string> = {
  addLensPanelAction: i18n.translate('dashboard.emptyScreen.createVisualizationTitle', {
    defaultMessage: 'Create visualization',
  }),
  ACTION_CREATE_ESQL_CHART: i18n.translate('dashboard.emptyScreen.createEsqlVisualizationTitle', {
    defaultMessage: 'Create visualization (query)',
  }),
};

export function DashboardEmptyScreen() {
  const { showWriteControls } = useMemo(() => {
    return getDashboardCapabilities();
  }, []);

  const dashboardApi = useDashboardApi();
  const { featuredItems } = useFeaturedItems({ dashboardApi });
  const isDarkTheme = useKibanaIsDarkMode();
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);
  const isEditMode = viewMode === 'edit';

  const styles = useMemoCss(emptyScreenStyles);

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
    if (showEditPrompt) return undefined;
    const bodyString = showWriteControls
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
        <EuiFlexGroup direction="column" gutterSize="s" css={styles.actionsWrapper}>
          {featuredItems.map((item) => (
            <EuiFlexItem key={item.id} grow={false}>
              <EuiPanel
                hasBorder
                paddingSize="none"
                onClick={item.onClick}
                css={styles.actionPanel}
                data-test-subj={item['data-test-subj']}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={item.icon} size="m" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{customTitles[item.id] ?? item.name}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {item.description}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
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
    <div css={emptyScreenStyles.parent}>
      <EuiPageTemplate grow={false} data-test-subj={emptyPromptTestSubject} css={styles.template}>
        <EuiPageTemplate.EmptyPrompt
          icon={<EuiImage size="fullWidth" src={imageUrl} alt="" />}
          title={title}
          body={body}
          actions={actions}
          titleSize="xs"
          color="transparent"
          css={styles.widgetContainer}
        />
      </EuiPageTemplate>
    </div>
  );
}

const emptyScreenStyles = {
  parent: css({
    display: 'flex',
    flexGrow: 1,
    height: '100%',
  }),
  template: css({
    backgroundColor: 'inherit',
    paddingBlockStart: '0 !important',
  }),
  widgetContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.xl,
      paddingTop: '0 !important',
      borderRadius: euiTheme.border.radius.medium,
      '.euiEmptyPrompt__icon': {
        marginBottom: euiTheme.size.l,
        paddingRight: euiTheme.size.s,
      },
    }),
  actionsWrapper: css({
    width: '100%',
  }),
  actionPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
      cursor: 'pointer',
    }),
};
