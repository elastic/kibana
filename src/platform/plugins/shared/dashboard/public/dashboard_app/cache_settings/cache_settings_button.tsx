/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiPanel, EuiRadioGroup, EuiSpacer, EuiTitle, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import {
  dashboardCacheService,
  type RevalidationMode,
} from '../../services/dashboard_cache_service';

const REVALIDATION_OPTIONS = [
  { id: 'always', label: 'Always trigger a refresh when the time range has exceeded' },
  { id: 'tolerance', label: 'Tolerance interval (5%)' },
  { id: 'never', label: 'Never (leave it up to the user)' },
];

const panelStyles = {
  overlay: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      bottom: `calc(${layoutVar('application.content.bottom', '0px')} + ${euiTheme.size.l})`,
      right: `calc(${layoutVar('application.content.right', '0px')} + ${euiTheme.size.l})`,
      zIndex: euiTheme.levels.header,
      width: 320,
    }),
};

export const CacheSettingsButton = () => {
  const styles = useMemoCss(panelStyles);
  const [mode, setMode] = useState<RevalidationMode>(dashboardCacheService.getRevalidationMode());

  const onModeChange = (id: string) => {
    const newMode = id as RevalidationMode;
    setMode(newMode);
    dashboardCacheService.setRevalidationMode(newMode);
  };

  return (
    <EuiPanel css={styles.overlay} paddingSize="s" hasShadow>
      <EuiTitle size="xxs">
        <h4>Relative time range cache settings</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiRadioGroup
        options={REVALIDATION_OPTIONS}
        idSelected={mode}
        onChange={onModeChange}
        name="cacheRevalidationMode"
      />
    </EuiPanel>
  );
};
