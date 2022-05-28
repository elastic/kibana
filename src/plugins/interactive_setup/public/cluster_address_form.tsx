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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PingResult } from '../common';
import { SubmitErrorCallout } from './submit_error_callout';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useKibana } from './use_kibana';

export interface ClusterAddressFormValues {
  host: string;
}

export interface ClusterAddressFormProps {
  defaultValues?: ClusterAddressFormValues;
  onCancel?(): void;
  onSuccess?(result: PingResult, values: ClusterAddressFormValues): void;
}

export const ClusterAddressForm: FunctionComponent<ClusterAddressFormProps> = ({
  defaultValues = {
    host: 'https://localhost:9200',
  },
  onCancel,
  onSuccess,
}) => {
  const { http } = useKibana();

  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: async (values) => {
      const errors: ValidationErrors<ClusterAddressFormValues> = {};

      if (!values.host) {
        errors.host = i18n.translate('interactiveSetup.clusterAddressForm.hostRequiredError', {
          defaultMessage: 'Enter an address.',
        });
      } else {
        try {
          const url = new URL(values.host);
          if (!url.protocol || !url.hostname) {
            throw new Error();
          }
        } catch (error) {
          errors.host = i18n.translate('interactiveSetup.clusterAddressForm.hostInvalidError', {
            defaultMessage: "Enter a valid address, including 'http' or 'https'.",
          });
        }
      }

      return errors;
    },
    onSubmit: async (values) => {
      const url = new URL(values.host);
      const host = `${url.protocol}//${url.hostname}:${url.port || 9200}`;

      const result = await http.post<PingResult>('/internal/interactive_setup/ping', {
        body: JSON.stringify({ host }),
      });

      onSuccess?.(result, { host });
    },
  });

  return (
    <EuiForm component="form" noValidate {...eventHandlers}>
      {form.submitError && (
        <>
          <SubmitErrorCallout
            error={form.submitError}
            defaultTitle={i18n.translate('interactiveSetup.clusterAddressForm.submitErrorTitle', {
              defaultMessage: "Couldn't check address",
            })}
          />
          <EuiSpacer />
        </>
      )}

      <EuiFormRow
        label={i18n.translate('interactiveSetup.clusterAddressForm.hostLabel', {
          defaultMessage: 'Address',
        })}
        error={form.errors.host}
        isInvalid={form.touched.host && !!form.errors.host}
        fullWidth
      >
        <EuiFieldText
          name="host"
          value={form.values.host}
          isInvalid={form.touched.host && !!form.errors.host}
          placeholder="https://localhost:9200"
          fullWidth
        />
      </EuiFormRow>
      <EuiSpacer />

      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="right" iconType="arrowLeft" onClick={onCancel}>
            <FormattedMessage
              id="interactiveSetup.clusterAddressForm.cancelButton"
              defaultMessage="Back"
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
              id="interactiveSetup.clusterAddressForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Checking address…} other{Check address}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
