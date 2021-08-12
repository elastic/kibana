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
import { FormattedMessage } from '@kbn/i18n/react';

import type { PingResponse } from '../common';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useHttp } from './use_http';

export interface ClusterAddressFormValues {
  host: string;
}

export interface ClusterAddressFormProps {
  defaultValues?: ClusterAddressFormValues;
  onCancel?(): void;
  onSuccess?(values: ClusterAddressFormValues, result: PingResponse): void;
}

export const ClusterAddressForm: FunctionComponent<ClusterAddressFormProps> = ({
  defaultValues = {
    host: 'https://localhost:9200',
  },
  onCancel,
  onSuccess,
}) => {
  const http = useHttp();

  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: async (values) => {
      const errors: ValidationErrors<typeof values> = {};

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
            defaultMessage: 'Enter a valid address including protocol.',
          });
        }
      }

      return errors;
    },
    onSubmit: async (values) => {
      const url = new URL(values.host);
      const host = `${url.protocol}//${url.hostname}:${url.port || 9200}`;

      const result = await http.post<PingResponse>('/internal/interactive_setup/ping', {
        body: JSON.stringify({
          hosts: [host],
        }),
      });

      onSuccess?.({ host }, result);
    },
  });

  return (
    <EuiForm component="form" noValidate {...eventHandlers}>
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
              id="interactiveSetup.clusterAddressForm.validateButton"
              defaultMessage="{isSubmitting, select, true{Checking address…} other{Check address}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
