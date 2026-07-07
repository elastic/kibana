/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCode, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  sourceComponentType: string | null;
}

export const ComponentTitle = ({ sourceComponentType }: Props) => {
  const { euiTheme } = useEuiTheme();

  const titleCss = css`
    color: ${euiTheme.colors.textHeading};
    padding: 0;
  `;

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {sourceComponentType ? (
            <EuiCode transparentBackground css={titleCss}>
              {sourceComponentType}
            </EuiCode>
          ) : (
            <FormattedMessage
              id="kbnInspectComponent.inspectFlyout.dataSection.componentDataTitle"
              defaultMessage="Data"
            />
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
    </>
  );
};
