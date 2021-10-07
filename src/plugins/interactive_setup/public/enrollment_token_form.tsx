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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { EnrollmentToken } from '../common';
import { DocLink } from './doc_link';
import { SubmitErrorCallout } from './submit_error_callout';
import { TextTruncate } from './text_truncate';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useKibana } from './use_kibana';
import { useVerification } from './use_verification';
import { useVisibility } from './use_visibility';

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
  const { http } = useKibana();
  const { status, getCode } = useVerification();
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
          code: getCode(),
        }),
      });
      onSuccess?.();
    },
  });
  const [isVisible, buttonRef] = useVisibility<HTMLButtonElement>();

  useUpdateEffect(() => {
    if (status === 'verified' && isVisible) {
      form.submit();
    }
  }, [status]);

  const enrollmentToken = decodeEnrollmentToken(form.values.token);

  return (
    <EuiForm component="form" noValidate {...eventHandlers}>
      {status !== 'unverified' && !form.isSubmitting && !form.isValidating && form.submitError && (
        <>
          <SubmitErrorCallout
            error={form.submitError}
            defaultTitle={i18n.translate('interactiveSetup.enrollmentTokenForm.submitErrorTitle', {
              defaultMessage: "Couldn't configure Elastic",
            })}
          />
          <EuiSpacer />
        </>
      )}

      <EuiFormRow
        label={i18n.translate('interactiveSetup.enrollmentTokenForm.tokenLabel', {
          defaultMessage: 'Enrollment token',
        })}
        error={form.errors.token}
        isInvalid={form.touched.token && !!form.errors.token}
        helpText={
          enrollmentToken ? (
            <EnrollmentTokenDetails token={enrollmentToken} />
          ) : (
            <DocLink app="elasticsearch" doc="configuring-stack-security.html">
              <FormattedMessage
                id="interactiveSetup.enrollmentTokenForm.tokenHelpText"
                defaultMessage="Where do I find this?"
              />
            </DocLink>
          )
        }
        fullWidth
      >
        <EuiTextArea
          name="token"
          value={form.values.token}
          isInvalid={form.touched.token && !!form.errors.token}
          placeholder={i18n.translate('interactiveSetup.enrollmentTokenForm.tokenPlaceholder', {
            defaultMessage: 'Paste enrollment token from terminal.',
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
            buttonRef={buttonRef}
            type="submit"
            isLoading={form.isSubmitting}
            isDisabled={form.isSubmitted && form.isInvalid}
            fill
          >
            <FormattedMessage
              id="interactiveSetup.enrollmentTokenForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Configuring Elastic…} other{Configure Elastic}}"
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
      <EuiFlexItem grow={false} style={{ overflow: 'hidden' }}>
        <TextTruncate>
          <strong>{token.adr[0]}</strong>
        </TextTruncate>
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
