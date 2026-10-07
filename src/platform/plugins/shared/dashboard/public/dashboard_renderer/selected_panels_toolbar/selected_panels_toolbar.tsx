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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';

/** Floating toolbar shown while panels are selected; exposes the bulk actions available for the selection */
export const SelectedPanelsToolbar = () => {
  const dashboardApi = useDashboardApi();
  const styles = useMemoCss(selectedPanelsToolbarStyles);
  const [selectedPanelIds, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.selectedPanelIds$,
    dashboardApi.viewMode$
  );

  const onDelete = useCallback(() => {
    if (dashboardApi.canRemovePanels && !dashboardApi.canRemovePanels()) return;
    dashboardApi.removePanels(dashboardApi.selectedPanelIds$.value);
    dashboardApi.clearPanelSelection();
  }, [dashboardApi]);

  if (viewMode !== 'edit' || selectedPanelIds.length === 0) return null;

  const clearSelectionLabel = i18n.translate(
    'dashboard.selectedPanelsToolbar.clearSelectionAriaLabel',
    { defaultMessage: 'Clear selection' }
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
              onClick={dashboardApi.clearPanelSelection}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="dashboard.selectedPanelsToolbar.selectedCount"
              defaultMessage="{count} selected"
              values={{ count: selectedPanelIds.length }}
            />
          </EuiText>
        </EuiFlexItem>
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
};
