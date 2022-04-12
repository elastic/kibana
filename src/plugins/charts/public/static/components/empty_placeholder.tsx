/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

const style = css`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const EmptyPlaceholder = ({
  icon,
  iconColor = 'subdued',
  message = <FormattedMessage id="charts.noDataLabel" defaultMessage="No results found" />,
  dataTestSubj = 'emptyPlaceholder',
  className,
}: {
  icon: IconType;
  iconColor?: string;
  message?: JSX.Element;
  dataTestSubj?: string;
  className?: string;
}) => (
  <EuiText
    data-test-subj={dataTestSubj}
    css={style}
    className={className}
    textAlign="center"
    color="subdued"
    size="xs"
  >
    <EuiIcon type={icon} color={iconColor} size="l" />
    <EuiSpacer size="s" />
    <p>{message}</p>
  </EuiText>
);
