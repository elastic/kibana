/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { DocumentOverview } from '@kbn/discover-utils';

const LEVEL_DICT = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
  debug: 'accent',
} as const;

type Level = keyof typeof LEVEL_DICT;

interface LogLevelProps {
  level: DocumentOverview['log.level'];
}

export function LogLevel({ level }: LogLevelProps) {
  const { euiTheme } = useEuiTheme();

  if (!level) return null;
  const colorName = LEVEL_DICT[level as Level];
  const computedColor = colorName ? euiTheme.colors[colorName] : null;

  return (
    <EuiBadge
      color="hollow"
      css={css`
        max-width: 100px;
        ${computedColor ? `border: 2px solid ${computedColor};` : ''}
      `}
      data-test-subj="unifiedDocViewLogsOverviewLogLevel"
    >
      {level}
    </EuiBadge>
  );
}
