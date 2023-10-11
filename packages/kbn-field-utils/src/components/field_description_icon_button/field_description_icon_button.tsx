/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface FieldDescriptionIconButtonProps {
  customDescription: string | undefined;
  margin?: 'left' | 'right';
}

export const FieldDescriptionIconButton: React.FC<FieldDescriptionIconButtonProps> = ({
  customDescription,
  margin,
}) => {
  const { euiTheme } = useEuiTheme();
  if (!customDescription) {
    return null;
  }
  return (
    <span css={margin ? css`margin-${margin}:${euiTheme.size.xs}` : undefined}>
      <EuiToolTip content={customDescription} data-test-subj="fieldDescriptionIconButton">
        <EuiIcon
          type="iInCircle"
          aria-label={i18n.translate('fieldUtils.fieldDescriptionIconButtonTitle', {
            defaultMessage: 'Custom field description',
          })}
          size="m"
        />
      </EuiToolTip>
    </span>
  );
};
