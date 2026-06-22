/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButtonGroup, EuiPanel, EuiThemeProvider } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import type { DashboardListingTableLayout } from './types';

export interface DashboardListingTableLayoutSwitcherProps {
  layout: DashboardListingTableLayout;
  onLayoutChange: (layout: DashboardListingTableLayout) => void;
}

const switcherStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css`
      position: fixed;
      bottom: ${euiTheme.size.l};
      left: 50%;
      transform: translateX(-50%);
      z-index: ${euiTheme.levels.menuPopover};
      pointer-events: auto;
    `,
  panel: ({ euiTheme }: UseEuiTheme) =>
    css`
      background-color: ${euiTheme.colors.backgroundBasePlainHeavy};
      border: ${euiTheme.border.thin};
    `,
};

export const DashboardListingTableLayoutSwitcher = ({
  layout,
  onLayoutChange,
}: DashboardListingTableLayoutSwitcherProps) => {
  const styles = useMemoCss(switcherStyles);

  const layoutOptions = useMemo(
    () => [
      {
        id: 'fullWidth' satisfies DashboardListingTableLayout,
        label: i18n.translate('dashboard.listing.tableVersions.fullWidth', {
          defaultMessage: 'Full width table',
        }),
      },
      {
        id: 'restricted' satisfies DashboardListingTableLayout,
        label: i18n.translate('dashboard.listing.tableVersions.restricted', {
          defaultMessage: 'Restricted table',
        }),
      },
    ],
    []
  );

  const legend = i18n.translate('dashboard.listing.tableVersions.legend', {
    defaultMessage: 'Table layout version',
  });

  return (
    <div css={styles.container} data-test-subj="dashboardListingTableLayoutSwitcher">
      <EuiThemeProvider colorMode="dark">
        <EuiPanel hasShadow paddingSize="s" css={styles.panel}>
          <EuiButtonGroup
            legend={legend}
            options={layoutOptions}
            idSelected={layout}
            onChange={(id) => onLayoutChange(id as DashboardListingTableLayout)}
            type="single"
            color="primary"
            data-test-subj="dashboardListingTableLayoutButtonGroup"
          />
        </EuiPanel>
      </EuiThemeProvider>
    </div>
  );
};
