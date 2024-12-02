/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { EuiButtonIcon, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';
import { ShowDebugging } from './show_debugging';

export interface Props {
  payload: {
    error: Error;
  };
  onClose?: () => void;
}

const strings = {
  getDescription: () =>
    i18n.translate('expressionError.errorComponent.description', {
      defaultMessage: 'Expression failed with the message:',
    }),
  getTitle: () =>
    i18n.translate('expressionError.errorComponent.title', {
      defaultMessage: 'Whoops! Expression failed',
    }),
};

export const Error: FC<Props> = ({ payload, onClose }) => {
  const message = payload.error?.message;

  const CloseIconButton = () => (
    <EuiButtonIcon color="danger" iconType="cross" onClick={onClose} aria-hidden />
  );

  return (
    <EuiCallOut
      css={{ maxWidth: 500 }}
      color="danger"
      iconType={CloseIconButton}
      title={strings.getTitle()}
    >
      <p>{message ? strings.getDescription() : ''}</p>
      {message && (
        <p css={{ padding: '0 16px' }}>
          <Markdown readOnly>{message}</Markdown>
        </p>
      )}
      <ShowDebugging payload={payload} />
    </EuiCallOut>
  );
};
