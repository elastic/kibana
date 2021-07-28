/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiIcon,
  EuiForm,
  EuiButton,
  EuiFormRow,
  EuiTextArea,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { euiThemeVars } from '@kbn/ui-shared-deps/theme';
import { useForm, ValidationErrors } from './use_form';
import { decodeEnrollmentToken, EnrollmentToken } from './decode_enrollment_token';
import { useHttp } from './use_http';

export interface EnrollmentTokenFormValues {
  token: string;
}

export interface EnrollmentTokenFormProps {
  defaultValues?: EnrollmentTokenFormValues;
  onCancel(): void;
  onSuccess?(): void;
}

export const EnrollmentTokenForm: FunctionComponent<EnrollmentTokenFormProps> = ({
  defaultValues = {
    token: '',
  },
  onCancel,
  onSuccess,
}) => {
  const http = useHttp();

  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: (values) => {
      const errors: ValidationErrors<typeof values> = {};

      if (!values.token) {
        errors.token = i18n.translate('interactiveSetup.enrollmentTokenForm.tokenRequiredError', {
          defaultMessage: 'Enter an enrollment token.',
        });
      } else {
        const decoded = decodeEnrollmentToken(values.token);
        if (!decoded) {
          errors.token = i18n.translate('interactiveSetup.enrollmentTokenForm.tokenInvalidError', {
            defaultMessage: 'Enter a valid enrollment token.',
          });
        }
      }

      return errors;
    },
    onSubmit: async (values) => {
      const decoded = decodeEnrollmentToken(values.token);
      if (decoded) {
        await Promise.all([
          http.post('/internal/interactive_setup/enroll/kibana', {
            body: JSON.stringify({
              hosts: decoded.adr,
              apiKey: decoded.key,
              caFingerprint: decoded.fgr,
            }),
          }),
          new Promise((resolve) => setTimeout(resolve, 1600)), // Shorten perceived duration of preboot step
        ]);
        onSuccess?.();
      }
    },
  });

  const token = decodeEnrollmentToken(form.values.token);

  return (
    <EuiForm
      component="form"
      {...eventHandlers}
      noValidate
      style={{ width: euiThemeVars.euiFormMaxWidth }}
    >
      <EuiFormRow
        label={i18n.translate('interactiveSetup.enrollmentTokenForm.tokenLabel', {
          defaultMessage: 'Enrollment token',
        })}
        error={form.errors.token}
        isInvalid={form.touched.token && !!form.errors.token}
        helpText={token && <EnrollmentTokenDetails token={token} />}
      >
        <EuiTextArea
          name="token"
          value={form.values.token}
          isInvalid={form.touched.token && !!form.errors.token}
          placeholder={i18n.translate('interactiveSetup.enrollmentTokenForm.tokenPlaceholder', {
            defaultMessage: 'Paste enrollment token from terminal',
          })}
          style={{
            fontFamily: euiThemeVars.euiCodeFontFamily,
            fontSize: euiThemeVars.euiFontSizeXS,
          }}
          onKeyUp={() =>
            form.setValue(
              'token',
              btoa(
                JSON.stringify({
                  ver: '8.0.0',
                  adr: ['localhost:9200'],
                  fgr:
                    'AA:C8:2C:2E:09:58:F4:FE:A1:D2:AB:7F:13:70:C2:7D:EB:FD:A2:23:88:13:E4:DA:3A:D0:59:D0:09:00:07:36',
                  key: 'JH-36HoBo4EYIoVhHh2F:uEo4dksARMq_BSHaAHUr8Q',
                })
              )
            )
          }
        />
      </EuiFormRow>

      <EuiSpacer />
      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" iconType="gear" onClick={onCancel}>
            <FormattedMessage
              id="interactiveSetup.enrollmentTokenForm.cancelButton"
              defaultMessage="Configure manually"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            type="submit"
            isLoading={form.isSubmitting}
            isDisabled={form.isSubmitted && form.isInvalid}
            fill
          >
            <FormattedMessage
              id="interactiveSetup.enrollmentTokenForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Connecting to cluster…} other{Connect to cluster}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

interface EnrollmentTokenDetailsProps {
  token: EnrollmentToken;
}

const EnrollmentTokenDetails: FunctionComponent<EnrollmentTokenDetailsProps> = ({ token }) => (
  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiText size="xs">Connect to</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="lock" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">{token.adr[0]}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="logoElasticsearch" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">{`Elasticsearch (v${token.ver})`}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
