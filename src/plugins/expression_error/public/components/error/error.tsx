/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, MouseEventHandler } from 'react';
import { ClassNames } from '@emotion/react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ShowDebugging } from './show_debugging';

const euiCallOutHeaderClassDef = `
  .euiCallOutHeader__icon {
    cursor: pointer;
  }
`;

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

  const onCalloutClose: MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    const isHeaderCloseButton = (e.target as Element).classList.contains('euiCallOutHeader__icon');
    if (isHeaderCloseButton) {
      onClose?.();
    }
  };

  return (
    <ClassNames>
      {({ css }) => (
        <EuiCallOut
          style={{ maxWidth: 500 }}
          color="danger"
          iconType="cross"
          title={strings.getTitle()}
          onClick={onCalloutClose}
          className={css(euiCallOutHeaderClassDef)}
        >
          <p>{message ? strings.getDescription() : ''}</p>
          {message && <p style={{ padding: '0 16px' }}>{message}</p>}

          <ShowDebugging payload={payload} />
        </EuiCallOut>
      )}
    </ClassNames>
  );
};
