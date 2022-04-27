/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCode,
  EuiEmptyPrompt,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { VERIFICATION_CODE_LENGTH } from '../common';
import { getCommandLineSnippet } from './get_command_line_snippet';
import { SingleCharsField } from './single_chars_field';
import { SubmitErrorCallout } from './submit_error_callout';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useKibana } from './use_kibana';

export interface VerificationCodeFormValues {
  code: string;
}

export interface VerificationCodeFormProps {
  defaultValues?: VerificationCodeFormValues;
  onSuccess?(values: VerificationCodeFormValues): void;
}

export const VerificationCodeForm: FunctionComponent<VerificationCodeFormProps> = ({
  defaultValues = {
    code: '',
  },
  onSuccess,
}) => {
  const { http } = useKibana();
  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: async (values) => {
      const errors: ValidationErrors<VerificationCodeFormValues> = {};

      if (!values.code) {
        errors.code = i18n.translate('interactiveSetup.verificationCodeForm.codeRequiredError', {
          defaultMessage: 'Enter the verification code from the Kibana server.',
        });
      } else if (values.code.length !== VERIFICATION_CODE_LENGTH) {
        errors.code = i18n.translate('interactiveSetup.verificationCodeForm.codeMinLengthError', {
          defaultMessage: 'Enter all six digits.',
        });
      }

      return errors;
    },
    onSubmit: async (values) => {
      try {
        await http.post('/internal/interactive_setup/verify', {
          body: JSON.stringify({
            code: values.code,
          }),
        });
      } catch (error) {
        if ((error as IHttpFetchError).response?.status === 403) {
          form.setError('code', (error as IHttpFetchError<ResponseErrorBody>).body?.message || '');
          return;
        } else {
          throw error;
        }
      }
      onSuccess?.(values);
    },
  });

  return (
    <EuiForm component="form" noValidate onSubmit={eventHandlers.onSubmit}>
      <EuiEmptyPrompt
        iconType="lock"
        title={
          <h3>
            <FormattedMessage
              id="interactiveSetup.verificationCodeForm.title"
              defaultMessage="Verification required"
            />
          </h3>
        }
        body={
          <>
            {form.submitError && (
              <>
                <SubmitErrorCallout
                  error={form.submitError}
                  defaultTitle={i18n.translate(
                    'interactiveSetup.verificationCodeForm.submitErrorTitle',
                    {
                      defaultMessage: "Couldn't verify code",
                    }
                  )}
                />
                <EuiSpacer />
              </>
            )}

            <EuiText>
              <p>
                <FormattedMessage
                  id="interactiveSetup.verificationCodeForm.codeDescription"
                  defaultMessage="Copy the code from the Kibana server or run {command} to retrieve it."
                  values={{
                    command: (
                      <EuiCode language="bash">
                        {getCommandLineSnippet('kibana-verification-code')}
                      </EuiCode>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer />

            <EuiFormRow
              error={form.errors.code}
              isInvalid={form.touched.code && !!form.errors.code}
              fullWidth
            >
              <SingleCharsField
                defaultValue={form.values.code}
                length={VERIFICATION_CODE_LENGTH}
                separator={VERIFICATION_CODE_LENGTH / 2}
                onChange={(value) => form.setValue('code', value)}
                isInvalid={form.touched.code && !!form.errors.code}
                autoFocus
              />
            </EuiFormRow>
          </>
        }
        actions={
          <EuiButton
            type="submit"
            isLoading={form.isSubmitting}
            isDisabled={form.isSubmitted && form.isInvalid}
            fill
          >
            <FormattedMessage
              id="interactiveSetup.verificationCodeForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Verifying…} other{Verify}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
        }
      />
    </EuiForm>
  );
};
