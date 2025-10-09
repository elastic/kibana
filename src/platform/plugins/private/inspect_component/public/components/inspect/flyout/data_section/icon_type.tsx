/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  iconType: string | null;
}

export const IconType = ({ iconType }: Props) => {
  const { euiTheme } = useEuiTheme();

  const boldTextCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiText size="s" css={boldTextCss}>
        <FormattedMessage
          id="kbnInspectComponent.inspectFlyout.dataSection.iconTypeLabel"
          defaultMessage="Icon:"
        />
      </EuiText>
      <EuiText size="s">
        {iconType ? (
          iconType
        ) : (
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.dataSection.noIconTypeFound"
            defaultMessage="N/A"
          />
        )}
      </EuiText>
      {iconType && <EuiIcon type={iconType} size="m" />}
    </EuiFlexGroup>
  );
};
