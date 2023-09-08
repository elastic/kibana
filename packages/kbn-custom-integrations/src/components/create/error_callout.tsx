/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import {
  AuthorizationError,
  IntegrationError,
  IntegrationNotInstalledError,
  UnknownError,
} from '../../types';

const TITLE = i18n.translate('customIntegrationsPackage.create.errorCallout.title', {
  defaultMessage: 'Sorry, there was an error',
});

const RETRY_TEXT = i18n.translate('customIntegrationsPackage.create.errorCallout.retryText', {
  defaultMessage: 'Retry',
});

export const ErrorCallout = ({
  error,
  onRetry,
}: {
  error: IntegrationError;
  onRetry?: () => void;
}) => {
  if (error instanceof AuthorizationError) {
    const authorizationDescription = i18n.translate(
      'customIntegrationsPackage.create.errorCallout.authorization.description',
      {
        defaultMessage: 'This user does not have permissions to create an integration.',
      }
    );
    return <BaseErrorCallout message={authorizationDescription} onRetry={onRetry} />;
  } else if (error instanceof UnknownError || error instanceof IntegrationNotInstalledError) {
    return <BaseErrorCallout message={error.message} onRetry={onRetry} />;
  } else {
    return null;
  }
};

const BaseErrorCallout = ({ message, onRetry }: { message: string; onRetry?: () => void }) => {
  return (
    <EuiCallOut title={TITLE} color="danger" iconType="error">
      <>
        <p>{message}</p>
        {onRetry ? (
          <EuiButton
            data-test-subj="customIntegrationsPackageRetryButton"
            color="danger"
            size="s"
            onClick={onRetry}
          >
            {RETRY_TEXT}
          </EuiButton>
        ) : null}
      </>
    </EuiCallOut>
  );
};
