/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
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
import { createSpringTiming } from './spring';

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

const deletePanelsLabel = i18n.translate('dashboard.selectedPanelsToolbar.deletePanelsLabel', {
  defaultMessage: 'Delete panels',
});

/** Selecting again within this long after the toolbar left skips its entrance */
const QUICK_RESELECT_WINDOW = 1000;

/** Floating toolbar shown while panels are selected; exposes the bulk actions available for the selection */
export const SelectedPanelsToolbar = () => {
  const dashboardApi = useDashboardApi();
  const styles = useMemoCss(selectedPanelsToolbarStyles);
  const [selectedPanelIds, viewMode, children] = useBatchedPublishingSubjects(
    dashboardApi.selectedPanelIds$,
    dashboardApi.viewMode$,
    dashboardApi.children$
  );

  const isVisible = viewMode === 'edit' && selectedPanelIds.length > 0;

  // The toolbar leaves instantly when the selection is cleared. Selecting again right after skips
  // the entrance, so quick reselections don't replay it. Decided before paint, so the entrance
  // never starts and then cuts off.
  const [skipEntrance, setSkipEntrance] = useState(false);
  const wasVisibleRef = useRef(isVisible);
  const hiddenAtRef = useRef(0);
  useLayoutEffect(() => {
    if (isVisible === wasVisibleRef.current) return;
    wasVisibleRef.current = isVisible;
    if (isVisible) {
      setSkipEntrance(Date.now() - hiddenAtRef.current < QUICK_RESELECT_WINDOW);
    } else {
      hiddenAtRef.current = Date.now();
    }
  }, [isVisible]);

  const onRemove = useCallback(() => {
    if (dashboardApi.canRemovePanels && !dashboardApi.canRemovePanels()) return;
    dashboardApi.removePanels(dashboardApi.selectedPanelIds$.value);
    dashboardApi.clearSelectedPanels();
  }, [dashboardApi]);

  const onCopyToDashboard = useCallback(() => {
    openCopyToDashboardModal(dashboardApi, dashboardApi.selectedPanelIds$.value);
  }, [dashboardApi]);

  if (!isVisible) return null;

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
      data-skip-entrance={skipEntrance}
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
                iconType="addToDashboard"
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
          <EuiToolTip content={deletePanelsLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              size="s"
              iconSize="m"
              aria-label={deletePanelsLabel}
              onClick={onRemove}
              data-test-subj="dashboardSelectedPanelsRemove"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/**
 * Entrance: a 15px rise and a fade driven by one spring (stiffness 460, damping 27: lands at ~135ms,
 * overshoots ~6%, then settles). Opacity follows the same curve, so it briefly exceeds 1 with the
 * overshoot, which the browser clamps.
 */
const ENTER_SPRING = createSpringTiming({ stiffness: 460, damping: 27 });

/** Fallback curve for browsers without `linear()` easing */
const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';

// Opacity starts slightly below zero, so the toolbar is already moving when it becomes visible
// (the browser clamps the negative part). Animates `translate`, which composes with the centering
// `transform` instead of overriding it.
const enter = keyframes({
  from: { opacity: -0.1, translate: '0 15px' },
  to: { opacity: 1, translate: '0 0' },
});

const selectedPanelsToolbarStyles = {
  toolbar: ({ euiTheme, colorMode }: UseEuiTheme) =>
    css({
      position: 'fixed',
      bottom: euiTheme.size.l,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: euiTheme.levels.toast,
      transformOrigin: 'center bottom',
      animation: `${enter} 200ms ${EASE_OUT}`,
      '@supports (animation-timing-function: linear(0, 1))': {
        animation: `${enter} ${ENTER_SPRING.duration}ms ${ENTER_SPRING.easing}`,
      },
      '&[data-skip-entrance="true"]': { animation: 'none' },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
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
  // stretches with the row, trimmed at both ends, with room on either side for the groups it splits
  divider: ({ euiTheme, colorMode }: UseEuiTheme) =>
    css({
      width: euiTheme.border.width.thin,
      alignSelf: 'stretch',
      margin: `${euiTheme.size.xs} ${euiTheme.size.m}`,
      // the dark surface is lighter than the default border, which would disappear against it
      backgroundColor:
        colorMode === 'DARK' ? euiTheme.colors.borderBasePlain : euiTheme.colors.borderBaseSubdued,
    }),
};
