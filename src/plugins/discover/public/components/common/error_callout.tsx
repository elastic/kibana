/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiButtonIcon, EuiCallOut, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useCallback } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface ErrorCalloutProps {
  title: string;
  error: Error;
  inline?: boolean;
  'data-test-subj'?: string;
}

export const ErrorCallout = ({
  title,
  error,
  inline,
  'data-test-subj': dataTestSubj,
}: ErrorCalloutProps) => {
  const { core } = useDiscoverServices();

  const showError = useCallback(() => {
    core.notifications.showErrorDialog({ title, error });
  }, [core.notifications, error, title]);

  const showErrorMessage = i18n.translate('discover.errorCalloutShowErrorMessage', {
    defaultMessage: 'Show error details',
  });

  let formattedTitle: ReactNode = title;
  let body: ReactNode;

  if (inline) {
    const formattedTitleMessage = i18n.translate('discover.errorCalloutFormattedTitle', {
      defaultMessage: '{title}: {errorMessage}',
      values: { title, errorMessage: error.message },
    });

    formattedTitle = (
      <>
        {formattedTitleMessage}{' '}
        <EuiToolTip content={showErrorMessage} position="top">
          <EuiButtonIcon onClick={showError} iconType="inspect" aria-label={showErrorMessage} />
        </EuiToolTip>
      </>
    );
  } else {
    body = (
      <>
        <p>{error.message}</p>
        <EuiButton size="s" color="danger" onClick={() => showError()}>
          {showErrorMessage}
        </EuiButton>
      </>
    );
  }

  return (
    <EuiCallOut
      title={formattedTitle}
      color="danger"
      iconType="error"
      size={inline ? 's' : undefined}
      children={body}
      data-test-subj={dataTestSubj}
    />
  );
};
