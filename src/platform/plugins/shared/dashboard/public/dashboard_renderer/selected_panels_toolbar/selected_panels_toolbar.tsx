/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  euiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { apiCanBeDuplicated, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import {
  userCanCopyToDashboard,
  openCopyToDashboardModal,
} from '../../dashboard_actions/copy_to_dashboard_action';

const clearSelectionLabel = i18n.translate('dashboard.selectedPanelsToolbar.clearSelectionLabel', {
  defaultMessage: 'Clear selection (Esc)',
});

const copyToDashboardDisabledLabel = i18n.translate(
  'dashboard.selectedPanelsToolbar.copyToDashboardDisabledLabel',
  {
    defaultMessage: 'Some of the selected panels cannot be copied',
  }
);

/** Floating toolbar shown while panels are selected; exposes the bulk actions available for the selection */
export const SelectedPanelsToolbar = () => {
  const dashboardApi = useDashboardApi();
  const styles = useMemoCss(selectedPanelsToolbarStyles);
  const [selectedPanelIds, viewMode, children] = useBatchedPublishingSubjects(
    dashboardApi.selectedPanelIds$,
    dashboardApi.viewMode$,
    dashboardApi.children$
  );

  const onDelete = useCallback(() => {
    if (dashboardApi.canRemovePanels && !dashboardApi.canRemovePanels()) return;
    dashboardApi.removePanels(dashboardApi.selectedPanelIds$.value);
    dashboardApi.clearSelectedPanels();
  }, [dashboardApi]);

  const onCopyToDashboard = useCallback(() => {
    openCopyToDashboardModal(dashboardApi, dashboardApi.selectedPanelIds$.value);
  }, [dashboardApi]);

  if (viewMode !== 'edit' || selectedPanelIds.length === 0) return null;

  const showCopyToDashboard = userCanCopyToDashboard();
  const canCopySelection = selectedPanelIds.every((panelId) =>
    apiCanBeDuplicated(children[panelId])
  );

  return (
    <EuiPanel
      css={styles.toolbar}
      paddingSize="s"
      hasShadow
      hasBorder
      data-test-subj="dashboardSelectedPanelsToolbar"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={clearSelectionLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={clearSelectionLabel}
              data-test-subj="dashboardSelectedPanelsClear"
              onClick={dashboardApi.clearSelectedPanels}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="primary"
            css={styles.count}
            data-test-subj="dashboardSelectedPanelsCount"
          >
            <FormattedMessage
              id="dashboard.selectedPanelsToolbar.selectedCount"
              defaultMessage="{count} selected"
              values={{ count: selectedPanelIds.length }}
            />
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span css={styles.divider} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* No gutter between the actions: the buttons' own padding already separates them */}
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            {showCopyToDashboard && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={canCopySelection ? undefined : copyToDashboardDisabledLabel}>
                  <EuiButtonEmpty
                    iconType="logOut"
                    color="text"
                    size="s"
                    isDisabled={!canCopySelection}
                    hasAriaDisabled
                    onClick={onCopyToDashboard}
                    data-test-subj="dashboardSelectedPanelsCopyToDashboard"
                  >
                    <FormattedMessage
                      id="dashboard.selectedPanelsToolbar.copyToDashboardButtonLabel"
                      defaultMessage="Copy to dashboard"
                    />
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="trash"
                color="danger"
                size="s"
                onClick={onDelete}
                data-test-subj="dashboardSelectedPanelsDelete"
              >
                <FormattedMessage
                  id="dashboard.selectedPanelsToolbar.deleteButtonLabel"
                  defaultMessage="Delete"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const selectedPanelsToolbarStyles = {
  toolbar: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      bottom: euiTheme.size.l,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: euiTheme.levels.toast,
    }),
  // EuiBadge is fixed to the `xs` font scale; use the `s` scale of the small "Delete" button next to it
  count: (euiThemeContext: UseEuiTheme) => css(euiFontSize(euiThemeContext, 's')),
  divider: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      width: euiTheme.border.width.thin,
      height: euiTheme.size.l,
      backgroundColor: euiTheme.colors.borderBaseSubdued,
    }),
};
