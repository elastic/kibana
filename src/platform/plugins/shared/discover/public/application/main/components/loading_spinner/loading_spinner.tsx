/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLoadingSpinner, EuiTitle, EuiSpacer, UseEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export function LoadingSpinner() {
  const loadingSpinnerCss = ({ euiTheme }: UseEuiTheme) => css`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    padding: ${euiTheme.size.l} 0;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    z-index: 3;
  `;

  return (
    <div className="dscLoading" css={loadingSpinnerCss}>
      <EuiTitle size="s" data-test-subj="loadingSpinnerText">
        <h2>
          <FormattedMessage id="discover.searchingTitle" defaultMessage="Searching" />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiLoadingSpinner size="l" data-test-subj="loadingSpinner" />
    </div>
  );
}
