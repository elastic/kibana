/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiButton, EuiButtonProps } from '@elastic/eui';

export interface Props {
  onClick: () => void;
  size?: EuiButtonProps['size'];
  color?: EuiButtonProps['color'];
  isButtonEmpty?: boolean;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function ViewWarningButton({
  onClick,
  size = 's',
  color = 'warning',
  isButtonEmpty = false,
}: Props) {
  const Component = isButtonEmpty ? EuiLink : EuiButton;

  return (
    <Component color={color} size={size} onClick={onClick} data-test-subj="viewWarningBtn">
      <FormattedMessage
        id="searchResponseWarnings.viewDetailsButtonLabel"
        defaultMessage="View details"
        description="View warning details button label"
      />
    </Component>
  );
}
