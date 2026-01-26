/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { FieldErrors, UseFormSetError } from 'react-hook-form';
import type { FormValues } from './types';

interface ErrorCallOutProps {
  errors: FieldErrors<FormValues>;
  isSubmitted: boolean;
  isQueryInvalid?: boolean;
  setError: UseFormSetError<FormValues>;
}

export const ErrorCallOut: React.FC<ErrorCallOutProps> = ({
  errors,
  isSubmitted,
  isQueryInvalid,
  setError,
}) => {
  useEffect(() => {
    if (isQueryInvalid) {
      setError('query', {
        type: 'manual',
        message: i18n.translate('xpack.esqlRuleForm.invalidQueryError', {
          defaultMessage:
            'The ESQL query resulted in an error. Please review the query before saving the rule.',
        }),
      });
    } else {
      setError('query', { type: 'manual', message: undefined });
    }
  }, [isQueryInvalid, setError]);

  const errorMessages = Object.values(errors)
    .map((error) => error?.message)
    .filter(Boolean);

  const isFormInvalid = errorMessages.length > 0 && isSubmitted;

  if (!isFormInvalid) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount={true}
        title={i18n.translate('xpack.esqlRuleForm.formErrorsTitle', {
          defaultMessage: 'Please address the highlighted errors.',
        })}
        color="danger"
      >
        <ul>
          {errorMessages.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
