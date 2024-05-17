/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  useEuiBackgroundColor,
  useEuiPaddingSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export function LoadingSpinner() {
  const loadingSpinnerCss = css`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    padding: ${useEuiPaddingSize('l')} 0;
    background-color: ${useEuiBackgroundColor('plain')};
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
