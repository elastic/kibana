/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { euiPaletteRed } from '@elastic/eui';

const dataTestSubj = 'unifiedDocViewLogsOverviewEventType';

const badgeCss = (euiTheme: EuiThemeComputed) => css`
  max-width: calc(${euiTheme.size.base} * 7.5);
`;

const euiPaletteRed9 = euiPaletteRed(14);
interface EventTypeProps {
  eventTypeValue: React.ReactNode;
}
export function EventType({ eventTypeValue }: EventTypeProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiBadge color={euiPaletteRed9[9]} data-test-subj={dataTestSubj} css={badgeCss(euiTheme)}>
      <EuiText
        size="xs"
        // Value returned from formatFieldValue is always sanitized
        dangerouslySetInnerHTML={{ __html: eventTypeValue ?? '' }}
      />
    </EuiBadge>
  );
}
