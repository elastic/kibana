/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Variables } from './variables';

interface Props {
  onClose: () => void;
}

export const VariablesFlyout = ({ onClose }: Props) => {
  return (
    <EuiFlyout
      ownFocus={true}
      onClose={onClose}
      aria-label={i18n.translate('console.variablesFlyout.ariaLabel', {
        defaultMessage: 'Variables',
      })}
      data-test-subj="consoleVariablesFlyout"
      size="m"
    >
      <EuiFlyoutBody>
        <Variables />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
