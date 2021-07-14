/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiForm,
  EuiButton,
  EuiFormRow,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFieldPassword,
  EuiFilePicker,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { euiThemeVars } from '@kbn/ui-shared-deps/theme';
import { useForm, ValidationErrors } from './use_form';
import { getFingerprint } from './get_fingerprint';
import { useHttp } from './use_http';

export interface ManualConfigurationFormValues {
  host: string;
  username: string;
  password: string;
  caFingerprint: string;
}

export interface ManualConfigurationFormProps {
  defaultValues?: ManualConfigurationFormValues;
  onCancel(): void;
  onSuccess?(): void;
}

export const ManualConfigurationForm: FunctionComponent<ManualConfigurationFormProps> = ({
  defaultValues = {
    host: 'localhost:9200',
    username: 'elastic',
    password: '',
    caFingerprint: '',
  },
  onCancel,
  onSuccess,
}) => {
  const http = useHttp();

  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: (values) => {
      const errors: ValidationErrors<typeof values> = {};

      if (!values.host) {
        errors.host = i18n.translate('interactiveSetup.manualConfigurationForm.hostRequiredError', {
          defaultMessage: 'Enter an address.',
        });
      }

      if (!values.username) {
        errors.username = i18n.translate(
          'interactiveSetup.manualConfigurationForm.usernameRequiredError',
          {
            defaultMessage: 'Enter a username.',
          }
        );
      }

      if (!values.password) {
        errors.password = i18n.translate(
          'interactiveSetup.manualConfigurationForm.passwordRequiredError',
          {
            defaultMessage: 'Enter a password.',
          }
        );
      }

      if (!values.caFingerprint) {
        errors.caFingerprint = i18n.translate(
          'interactiveSetup.manualConfigurationForm.caFingerprintRequiredError',
          {
            defaultMessage: 'Enter a CA certificate.',
          }
        );
      }

      return errors;
    },
    onSubmit: async (values) => {
      await http.post('/api/preboot/setup', {
        body: JSON.stringify({
          hosts: [values.host],
          username: values.username,
          password: values.password,
          caFingerprint: values.caFingerprint,
        }),
      });
      onSuccess?.();
    },
  });

  return (
    <EuiForm
      component="form"
      {...eventHandlers}
      noValidate
      style={{ width: euiThemeVars.euiFormMaxWidth }}
    >
      <EuiFormRow
        label={i18n.translate('interactiveSetup.manualConfigurationForm.hostLabel', {
          defaultMessage: 'Elasticsearch address',
        })}
        error={form.errors.host}
        isInvalid={form.touched.host && !!form.errors.host}
      >
        <EuiFieldText
          name="host"
          value={form.values.host}
          isInvalid={form.touched.host && !!form.errors.host}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('interactiveSetup.manualConfigurationForm.usernameLabel', {
          defaultMessage: 'Admin username',
        })}
        error={form.errors.username}
        isInvalid={form.touched.username && !!form.errors.username}
      >
        <EuiFieldText
          name="username"
          value={form.values.username}
          isInvalid={form.touched.username && !!form.errors.username}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('interactiveSetup.manualConfigurationForm.passwordLabel', {
          defaultMessage: 'Admin password',
        })}
        error={form.errors.password}
        isInvalid={form.touched.password && !!form.errors.password}
      >
        <EuiFieldPassword
          type="dual"
          name="password"
          value={form.values.password}
          isInvalid={form.touched.password && !!form.errors.password}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('interactiveSetup.manualConfigurationForm.caLabel', {
          defaultMessage: 'Elasticsearch certificate authority',
        })}
        error={form.errors.caFingerprint}
        isInvalid={form.touched.caFingerprint && !!form.errors.caFingerprint}
      >
        <EuiFilePicker
          name="caFingerprint"
          isInvalid={form.touched.caFingerprint && !!form.errors.caFingerprint}
          accept=".pem,.crt,.cert"
          onChange={async (files) => {
            if (!files || !files.length) {
              form.setValue('caFingerprint', '');
              return;
            }
            if (files[0].type !== 'application/x-x509-ca-cert') {
              form.setError(
                'caFingerprint',
                'Invalid certificate, upload x509 CA cert in PEM format'
              );
              return;
            }
            const cert = await readFile(files[0]);
            const hash = await getFingerprint(cert);
            form.setValue('caFingerprint', hash);
          }}
        />
      </EuiFormRow>

      <EuiSpacer />
      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" iconType="arrowLeft" onClick={onCancel}>
            <FormattedMessage
              id="interactiveSetup.manualConfigurationForm.cancelButton"
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
              id="interactiveSetup.manualConfigurationForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Connecting to cluster…} other{Connect to cluster}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

function readFile(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
