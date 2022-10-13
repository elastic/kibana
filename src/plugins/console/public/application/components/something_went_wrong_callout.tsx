/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

interface Props {
  error: Error;
  onButtonClick: () => void;
}

export const SomethingWentWrongCallout: FunctionComponent<Props> = ({ error, onButtonClick }) => {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <EuiCallOut
      iconType="alert"
      color="danger"
      title={i18n.translate('console.loadingError.title', {
        defaultMessage: 'Cannot load Console',
      })}
    >
      <EuiText>
        <p>
          <FormattedMessage
            id="console.loadingError.message"
            defaultMessage="Try reloading to get the latest data."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton color="danger" onClick={() => onButtonClick()}>
        <FormattedMessage id="console.loadingError.buttonLabel" defaultMessage="Reload Console" />
      </EuiButton>
    </EuiCallOut>
  );
};
