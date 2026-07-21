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
  EuiImage,
  EuiPageTemplate,
  EuiText,
  euiBreakpoint,
  euiMinBreakpoint,
} from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useDashboardApi } from '../../../dashboard_api/use_dashboard_api';
import { coreServices, uiActionsService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { useFeaturedItems } from '../../../dashboard_app/top_nav/add_panel_button/use_featured_items';
import { FeaturedItemCard } from '../../../dashboard_app/top_nav/add_panel_button/components/featured_item_card';
import { DashboardEmptyScreenChat } from './dashboard_empty_screen_chat';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from './dashboard_empty_screen_chat_action';

export function DashboardEmptyScreen() {
  const { showWriteControls } = useMemo(() => {
    return getDashboardCapabilities();
  }, []);

  const dashboardApi = useDashboardApi();
  const { featuredItems, loading: featuredItemsLoading } = useFeaturedItems({ dashboardApi });
  const isDarkTheme = useKibanaIsDarkMode();
  const viewMode = useStateFromPublishingSubject(dashboardApi.viewMode$);
  const isEditMode = viewMode === 'edit';
  const hasChatItem = uiActionsService.hasAction(OPEN_DASHBOARD_CHAT_ACTION_ID);

  const styles = useMemoCss(emptyScreenStyles);

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = coreServices.http.basePath.prepend(
    `/plugins/dashboard/assets/${isDarkTheme ? 'dashboards_dark' : 'dashboards_light'}.svg`
  );

  // If the user ends up in edit mode without write privileges, we shouldn't show the edit prompt.
  const showEditPrompt = showWriteControls && isEditMode;

  if (showEditPrompt && featuredItemsLoading) {
    return <div css={emptyScreenStyles.parent} />;
  }

  const emptyPromptTestSubject = (() => {
    if (showEditPrompt) return 'emptyDashboardWidget';
    return showWriteControls ? 'dashboardEmptyReadWrite' : 'dashboardEmptyReadOnly';
  })();

  const title = (() => {
    const titleString = showEditPrompt
      ? i18n.translate('dashboard.emptyScreen.editModeTitle', {
          defaultMessage: 'This dashboard is empty',
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
          defaultMessage: 'Choose how you want to create a visualization',
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
        <EuiFlexGroup gutterSize="s" wrap css={styles.actionsWrapper}>
          {
            hasChatItem && 
            <EuiFlexItem
                key={OPEN_DASHBOARD_CHAT_ACTION_ID}
                grow={hasChatItem}
                css={styles.chatItem}
              >
                <DashboardEmptyScreenChat />
            </EuiFlexItem>
          }
          {featuredItems.map((item) => {
            return (
              <EuiFlexItem
                key={item.id}
                grow={hasChatItem}
                css={styles.featuredItem}
              >
                {<FeaturedItemCard item={item} />}
              </EuiFlexItem>
            );
          })}
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
    minWidth: 0,
    width: '100%',
  }),
  template: css({
    backgroundColor: 'inherit',
    paddingBlockStart: '0 !important',
    width: '100%',
    minWidth: 0,
  }),
  widgetContainer: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      width: '100%',
      // Wide enough for "Create visualization (with query)" to stay on one line
      // beside its icon when the two featured cards sit side-by-side on laptop.
      maxWidth: '56rem',
      minWidth: 0,
      boxSizing: 'border-box',
      padding: euiTheme.size.xl,
      paddingTop: '0 !important',
      borderRadius: euiTheme.border.radius.medium,
      [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
        maxWidth: '100%',
        padding: euiTheme.size.base,
        paddingTop: '0 !important',
      },
      [euiMinBreakpoint(euiThemeContext, 'm')]: {
        width: '49rem',
      },
      '.euiEmptyPrompt__icon': {
        marginBottom: euiTheme.size.l,
        paddingRight: euiTheme.size.s,
        maxWidth: '100%',
        [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
          marginBottom: euiTheme.size.m,
          paddingRight: 0,
        },
      },
      '.euiEmptyPrompt__content, .euiEmptyPrompt__actions': {
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      },
    });
  },
  actionsWrapper: css({
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  }),
  // Force Chat onto its own full-width row above the other featured cards.
  chatItem: css({
    flexBasis: '100%',
    minWidth: 0,
  }),
  featuredItem: css({
    minWidth: 0,
  }),
};
