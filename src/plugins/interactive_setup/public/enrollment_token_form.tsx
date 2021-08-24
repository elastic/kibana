/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { IHttpFetchError } from 'kibana/public';

import type { EnrollmentToken } from '../common';
import { TextTruncate } from './text_truncate';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useHttp } from './use_http';

export interface EnrollmentTokenFormValues {
  token: string;
}

export interface EnrollmentTokenFormProps {
  defaultValues?: EnrollmentTokenFormValues;
  onCancel?(): void;
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
      const errors: ValidationErrors<EnrollmentTokenFormValues> = {};

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
      const decoded = decodeEnrollmentToken(values.token)!;
      await http.post('/internal/interactive_setup/enroll', {
        body: JSON.stringify({
          hosts: decoded.adr,
          apiKey: decoded.key,
          caFingerprint: decoded.fgr,
        }),
      });
      onSuccess?.();
    },
  });

  const enrollmentToken = decodeEnrollmentToken(form.values.token);

  return (
    <EuiForm component="form" noValidate {...eventHandlers}>
      {form.submitError && (
        <>
          <EuiCallOut
            color="danger"
            title={i18n.translate('interactiveSetup.enrollmentTokenForm.submitErrorTitle', {
              defaultMessage: "Couldn't connect to cluster",
            })}
          >
            {(form.submitError as IHttpFetchError).body?.message}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiFormRow
        label={i18n.translate('interactiveSetup.enrollmentTokenForm.tokenLabel', {
          defaultMessage: 'Enrollment token',
        })}
        error={form.errors.token}
        isInvalid={form.touched.token && !!form.errors.token}
        helpText={enrollmentToken && <EnrollmentTokenDetails token={enrollmentToken} />}
        fullWidth
      >
        <EuiTextArea
          name="token"
          value={form.values.token}
          isInvalid={form.touched.token && !!form.errors.token}
          placeholder={i18n.translate('interactiveSetup.enrollmentTokenForm.tokenPlaceholder', {
            defaultMessage: 'Paste enrollment token from terminal',
          })}
          fullWidth
        />
      </EuiFormRow>
      <EuiSpacer />

      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="right" iconType="gear" onClick={onCancel}>
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
  <EuiText size="xs">
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false} className="eui-textNoWrap">
        <FormattedMessage
          id="interactiveSetup.enrollmentTokenDetails.connectTo"
          defaultMessage="Connect to"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="lock" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ overflow: 'hidden' }}>
        <TextTruncate>{token.adr[0]}</TextTruncate>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="logoElasticsearch" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="eui-textNoWrap">
        <FormattedMessage
          id="interactiveSetup.enrollmentTokenDetails.elasticsearchVersion"
          defaultMessage="Elasticsearch (v{version})"
          values={{ version: token.ver }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiText>
);

export function decodeEnrollmentToken(enrollmentToken: string) {
  try {
    const json = JSON.parse(atob(enrollmentToken)) as EnrollmentToken;
    if (
      !Array.isArray(json.adr) ||
      json.adr.some((adr) => typeof adr !== 'string') ||
      typeof json.fgr !== 'string' ||
      typeof json.key !== 'string' ||
      typeof json.ver !== 'string'
    ) {
      return;
    }
    return {
      ...json,
      adr: json.adr.map((host) => `https://${host}`),
      key: btoa(json.key),
    };
  } catch (error) {} // eslint-disable-line no-empty
}
