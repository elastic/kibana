/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import {
  copyColorMapping,
  hasColorMapping,
} from '../../dashboard_actions/share_color_mapping_action';
import { getPanelTitle } from '../selected_panels_toolbar/describe_panel';
import { coreServices } from '../../services/kibana_services';

const strings = {
  getShareColors: () =>
    i18n.translate('dashboard.selectedPanelActions.shareColors', {
      defaultMessage: 'Share these colors with the other selected panels',
    }),
  getColorsApplied: (source: string, count: number) =>
    i18n.translate('dashboard.selectedPanelActions.colorsApplied', {
      defaultMessage:
        'Applied colors from "{source}" to {count, plural, one {# panel} other {# panels}}',
      values: { source, count },
    }),
  getUntitledPanel: () =>
    i18n.translate('dashboard.selectedPanelActions.untitledPanel', {
      defaultMessage: 'Untitled panel',
    }),
};

/**
 * Always-visible actions shown on a selected panel in place of its regular hover actions.
 */
export const SelectedPanelActions = ({
  panelId,
  selectedPanelIds,
}: {
  panelId: string;
  selectedPanelIds: Set<string>;
}) => {
  const dashboardApi = useDashboardApi();
  const children = useStateFromPublishingSubject(dashboardApi.children$);
  const { euiTheme } = useEuiTheme();

  const colorTargetIds = useMemo(() => {
    if (!hasColorMapping(children[panelId])) return [];
    return Array.from(selectedPanelIds).filter(
      (id) => id !== panelId && hasColorMapping(children[id])
    );
  }, [children, panelId, selectedPanelIds]);

  const shareColors = useCallback(() => {
    const source = children[panelId];
    const updated = copyColorMapping(
      source,
      colorTargetIds.map((id) => children[id])
    );
    if (updated > 0) {
      coreServices.notifications.toasts.addSuccess({
        title: strings.getColorsApplied(
          getPanelTitle(source) ?? strings.getUntitledPanel(),
          updated
        ),
        'data-test-subj': 'dashboardShareColorsAppliedToast',
      });
    }
  }, [children, colorTargetIds, panelId]);

  if (colorTargetIds.length === 0) return null;

  return (
    <div
      css={css({
        position: 'absolute',
        top: `calc(-${euiTheme.size.l} / 2)`,
        right: euiTheme.size.m,
        zIndex: euiTheme.levels.menu,
        display: 'flex',
        gap: euiTheme.size.xs,
      })}
      data-test-subj={`dashboardSelectedPanelActions-${panelId}`}
    >
      <EuiToolTip content={strings.getShareColors()} disableScreenReaderOutput>
        <EuiButtonIcon
          display="fill"
          color="primary"
          size="xs"
          iconType="palette"
          aria-label={strings.getShareColors()}
          onClick={shareColors}
          data-test-subj="dashboardSelectedPanelShareColors"
        />
      </EuiToolTip>
    </div>
  );
};
