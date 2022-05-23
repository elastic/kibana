/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useEuiTheme, EuiButton } from '@elastic/eui';

const loading = i18n.translate('sharedUXPackages.exitFullScreenButton.loadingLabel', {
  defaultMessage: 'Loading',
});

export const Fallback = () => {
  const { euiTheme } = useEuiTheme();
  const { size, border } = euiTheme;

  const fallbackCSS = css`
    padding: ${size.xs} ${size.s};
    border-radius: ${border.radius.small};
    height: ${size.xl};
  `;

  return <EuiButton css={fallbackCSS} isLoading={true} aria-label={loading} />;
};
