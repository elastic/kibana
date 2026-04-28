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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { History } from './history';

interface Props {
  onClose: () => void;
}

export const HistoryFlyout = ({ onClose }: Props) => {
  return (
    <EuiFlyout
      ownFocus={true}
      onClose={onClose}
      aria-label={i18n.translate('console.historyFlyout.ariaLabel', {
        defaultMessage: 'History',
      })}
      data-test-subj="consoleHistoryFlyout"
      size="l"
    >
      <EuiFlyoutBody
        css={css`
          display: flex;
          flex: 1 1 auto;
          min-height: 0;
        `}
      >
        <div
          css={css`
            display: flex;
            flex: 1 1 auto;
            min-height: 0;
          `}
        >
          <History />
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
