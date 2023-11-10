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
import { CreateTestSubjects } from './form';

const TITLE = i18n.translate('customIntegrationsPackage.create.errorCallout.title', {
  defaultMessage: 'Sorry, there was an error',
});

const RETRY_TEXT = i18n.translate('customIntegrationsPackage.create.errorCallout.retryText', {
  defaultMessage: 'Retry',
});

export const ErrorCallout = ({
  error,
  onRetry,
  testSubjects,
}: {
  error: IntegrationError;
  onRetry?: () => void;
  testSubjects?: CreateTestSubjects['errorCallout'];
}) => {
  if (error instanceof AuthorizationError) {
    const authorizationDescription = i18n.translate(
      'customIntegrationsPackage.create.errorCallout.authorization.description',
      {
        defaultMessage: 'This user does not have permissions to create an integration.',
      }
    );
    return (
      <BaseErrorCallout
        message={authorizationDescription}
        onRetry={onRetry}
        testSubjects={testSubjects}
      />
    );
  } else if (error instanceof UnknownError || error instanceof IntegrationNotInstalledError) {
    return (
      <BaseErrorCallout message={error.message} onRetry={onRetry} testSubjects={testSubjects} />
    );
  } else {
    return null;
  }
};

const BaseErrorCallout = ({
  message,
  onRetry,
  testSubjects,
}: {
  message: string;
  onRetry?: () => void;
  testSubjects?: CreateTestSubjects['errorCallout'];
}) => {
  return (
    <EuiCallOut
      title={TITLE}
      color="danger"
      iconType="error"
      data-test-subj={testSubjects?.callout ?? 'customIntegrationsPackageCreateFormErrorCallout'}
    >
      <>
        <p>{message}</p>
        {onRetry ? (
          <EuiButton
            data-test-subj={
              testSubjects?.retryButton ??
              'customIntegrationsPackageCreateFormErrorCalloutRetryButton'
            }
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
