/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const getGuidePanelStepStyles = (euiTheme: EuiThemeComputed) => ({
  stepNumber: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid ${euiTheme.colors.success};
    font-weight: ${euiTheme.font.weight.medium};
    text-align: center;
    line-height: 1.4;
  `,
  stepTitle: css`
    font-weight: ${euiTheme.font.weight.bold};
  `,
});
