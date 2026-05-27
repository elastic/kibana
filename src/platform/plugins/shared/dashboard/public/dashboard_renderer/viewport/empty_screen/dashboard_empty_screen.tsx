/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { IconType, UseEuiTheme } from '@elastic/eui';
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
import { coreServices, uiActionsService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';

interface EmptyStateAction {
  actionId: string;
  title: string;
  description: string;
  icon: IconType;
  dataTestSubj: string;
}

const EMPTY_STATE_ACTIONS: readonly EmptyStateAction[] = [
  {
    actionId: 'addLensPanelAction',
    title: i18n.translate('dashboard.emptyScreen.createVisualizationTitle', {
      defaultMessage: 'Create visualization',
    }),
    description: i18n.translate('dashboard.emptyScreen.createVisualizationDescription', {
      defaultMessage: 'Build charts, metrics, and tables with a point-and-click editor.',
    }),
    icon: 'visBarVertical',
    dataTestSubj: 'emptyDashboardCreateVisualization',
  },
  {
    actionId: 'ACTION_CREATE_ESQL_CHART',
    title: i18n.translate('dashboard.emptyScreen.createEsqlVisualizationTitle', {
      defaultMessage: 'Create visualization (query)',
    }),
    description: i18n.translate('dashboard.emptyScreen.createEsqlVisualizationDescription', {
      defaultMessage: 'Build charts, metrics, and tables with ES|QL.',
    }),
    icon: 'editorCodeBlock',
    dataTestSubj: 'emptyDashboardCreateEsqlVisualization',
  },
] as const;

export function DashboardEmptyScreen() {
  const { showWriteControls } = useMemo(() => {
    return getDashboardCapabilities();
  }, []);

  const dashboardApi = useDashboardApi();
  const isDarkTheme = useKibanaIsDarkMode();
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);
  const isEditMode = viewMode === 'edit';

  const executeAction = useCallback(
    async (actionId: string) => {
      try {
        const action = await uiActionsService.getAction(actionId);
        const { triggers } = await import('@kbn/ui-actions-plugin/public');
        const { ADD_PANEL_TRIGGER } = await import('@kbn/ui-actions-plugin/common/trigger_ids');
        action.execute({
          embeddable: dashboardApi,
          trigger: triggers[ADD_PANEL_TRIGGER],
        } as ActionExecutionContext);
      } catch (error) {
        coreServices.notifications.toasts.addWarning(
          i18n.translate('dashboard.addNewPanelError', {
            defaultMessage: 'Unable to add new panel',
          })
        );
      }
    },
    [dashboardApi]
  );

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
          {EMPTY_STATE_ACTIONS.map((action) => (
            <EuiFlexItem key={action.actionId} grow={false}>
              <EuiPanel
                hasBorder
                paddingSize="none"
                onClick={() => executeAction(action.actionId)}
                css={styles.actionPanel}
                data-test-subj={action.dataTestSubj}
              >
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={action.icon} size="m" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{action.title}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {action.description}
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
