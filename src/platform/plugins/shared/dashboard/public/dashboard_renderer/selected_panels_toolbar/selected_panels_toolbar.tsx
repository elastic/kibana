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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  euiCanAnimate,
  transparentize,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
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

const copyToDashboardLabel = i18n.translate(
  'dashboard.selectedPanelsToolbar.copyToDashboardButtonLabel',
  {
    defaultMessage: 'Copy to dashboard',
  }
);

const copyToDashboardDisabledLabel = i18n.translate(
  'dashboard.selectedPanelsToolbar.copyToDashboardDisabledLabel',
  {
    defaultMessage: 'Some of the selected panels cannot be copied',
  }
);

const removeLabel = i18n.translate('dashboard.selectedPanelsToolbar.removeButtonLabel', {
  defaultMessage: 'Remove',
});

/** Floating toolbar shown while panels are selected; exposes the bulk actions available for the selection */
export const SelectedPanelsToolbar = () => {
  const dashboardApi = useDashboardApi();
  const styles = useMemoCss(selectedPanelsToolbarStyles);
  const [selectedPanelIds, viewMode, children] = useBatchedPublishingSubjects(
    dashboardApi.selectedPanelIds$,
    dashboardApi.viewMode$,
    dashboardApi.children$
  );

  const onRemove = useCallback(() => {
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
      paddingSize="none"
      hasShadow
      hasBorder={false}
      data-test-subj="dashboardSelectedPanelsToolbar"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={clearSelectionLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              size="s"
              iconSize="m"
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
        <div css={styles.divider} aria-hidden />
        {showCopyToDashboard && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={canCopySelection ? copyToDashboardLabel : copyToDashboardDisabledLabel}
              disableScreenReaderOutput={canCopySelection}
            >
              <EuiButtonIcon
                iconType="logOut"
                color="text"
                size="s"
                iconSize="m"
                aria-label={copyToDashboardLabel}
                isDisabled={!canCopySelection}
                hasAriaDisabled
                onClick={onCopyToDashboard}
                data-test-subj="dashboardSelectedPanelsCopyToDashboard"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={removeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              size="s"
              iconSize="m"
              aria-label={removeLabel}
              onClick={onRemove}
              data-test-subj="dashboardSelectedPanelsRemove"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// Animates `translate`, which composes with the centering `transform` instead of overriding it
const enter = keyframes({
  from: { opacity: 0, translate: '0 15px' },
  to: { opacity: 1, translate: '0 0' },
});

const selectedPanelsToolbarStyles = {
  toolbar: ({ euiTheme, colorMode }: UseEuiTheme) =>
    css({
      position: 'fixed',
      bottom: euiTheme.size.xxl,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: euiTheme.levels.toast,
      // EuiPanel's `paddingSize` jumps from 8px (`s`) to 16px (`m`): 8px is too short and 16px too tall
      padding: euiTheme.size.m,
      [euiCanAnimate]: {
        animation: `${enter} ${euiTheme.animation.normal} ${euiTheme.animation.bounce}`,
      },
      // In dark mode the default panel color is too close to the dashboard behind it and a dark
      // shadow is invisible: a lighter neutral surface, a stronger edge and a soft white glow keep
      // the toolbar visible
      ...(colorMode === 'DARK' && {
        backgroundColor: euiTheme.colors.backgroundBaseFormsPrepend,
        boxShadow: `0 0 ${euiTheme.size.s} ${transparentize(euiTheme.colors.plainLight, 0.16)}`,
        '&::after': { borderColor: euiTheme.colors.borderBasePlain },
      }),
    }),
  count: css({
    // equal-width digits, so the badge doesn't change width as the count changes
    fontVariantNumeric: 'tabular-nums',
  }),
  // stretches with the row, with room on either side for the groups it splits
  divider: ({ euiTheme, colorMode }: UseEuiTheme) =>
    css({
      width: euiTheme.border.width.thin,
      alignSelf: 'stretch',
      // the badge's pill sits at its box edge, but the next icon sits 8px inside its button,
      // so the right margin is smaller to make the visible space equal on both sides
      margin: `0 ${euiTheme.size.xs} 0 ${euiTheme.size.m}`,
      // the dark surface is lighter than the default border, which would disappear against it
      backgroundColor:
        colorMode === 'DARK' ? euiTheme.colors.borderBasePlain : euiTheme.colors.borderBaseSubdued,
    }),
};
