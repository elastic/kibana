/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../form/types';

export const ErrorCallOut: React.FC = () => {
  const {
    formState: { errors, isSubmitted },
  } = useFormContext<FormValues>();

  const errorMessages = Object.values(errors)
    .map((error) => error?.message)
    .filter((message): message is string => typeof message === 'string' && message.length > 0);

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
          {errorMessages.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
