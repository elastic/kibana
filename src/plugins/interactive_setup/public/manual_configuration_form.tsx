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
import { useHttp } from './use_http';

export interface ManualConfigurationFormValues {
  host: string;
  username: string;
  password: string;
  caCert: string;
}

export interface ManualConfigurationFormProps {
  defaultValues?: ManualConfigurationFormValues;
  onCancel(): void;
  onSuccess?(): void;
}

export const ManualConfigurationForm: FunctionComponent<ManualConfigurationFormProps> = ({
  defaultValues = {
    host: 'https://localhost:9200',
    username: 'kibana_system',
    password: '',
    caCert: '',
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
      } else {
        try {
          const url = new URL(values.host);
          if (!url.protocol || !url.hostname || !url.port) {
            throw new Error();
          }
        } catch (error) {
          errors.host = i18n.translate(
            'interactiveSetup.manualConfigurationForm.hostInvalidError',
            {
              defaultMessage: 'Enter a valid address including protocol and port number.',
            }
          );
        }
      }

      if (!values.username) {
        errors.username = i18n.translate(
          'interactiveSetup.manualConfigurationForm.usernameRequiredError',
          {
            defaultMessage: 'Enter a username.',
          }
        );
      } else if (values.username === 'elastic') {
        errors.username = i18n.translate(
          'interactiveSetup.manualConfigurationForm.usernameRequiredError',
          {
            defaultMessage: "Superuser 'elastic' can't be used as Kibana system user.",
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

      if (!values.caCert) {
        errors.caCert = i18n.translate(
          'interactiveSetup.manualConfigurationForm.caCertRequiredError',
          {
            defaultMessage: 'Upload a CA certificate.',
          }
        );
      }

      return errors;
    },
    onSubmit: async (values) => {
      try {
        await http.post('/internal/interactive_setup/configure', {
          body: JSON.stringify({
            hosts: [values.host],
            username: values.username,
            password: values.password,
            caCert: values.caCert,
          }),
        });
        onSuccess?.();
      } catch (error) {
        if (error.body?.message.includes('self signed certificate in certificate chain')) {
          form.setError('caCert', 'CA did not match Elasticsearch cluster');
        } else if (error.body?.message.includes('unable to authenticate user')) {
          form.setError('username', 'unable to authenticate user');
          form.setError('password', 'unable to authenticate user');
        } else {
          throw error;
        }
      }
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
          onBlur={(event) => {
            if (!form.touched.host || !form.errors.host) {
              form.setValue('host', resolveAddress(event.target.value));
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('interactiveSetup.manualConfigurationForm.usernameLabel', {
          defaultMessage: 'Kibana system username',
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
          defaultMessage: 'Kibana system password',
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
        error={form.errors.caCert}
        isInvalid={form.touched.caCert && !!form.errors.caCert}
      >
        <EuiFilePicker
          name="caCert"
          isInvalid={form.touched.caCert && !!form.errors.caCert}
          accept=".pem,.crt,.cert"
          onChange={async (files) => {
            form.setTouched('caCert');
            if (!files || !files.length) {
              form.setValue('caCert', '');
              return;
            }
            if (files[0].type !== 'application/x-x509-ca-cert') {
              form.setError('caCert', 'Invalid certificate, upload x509 CA cert in PEM format');
              return;
            }
            const cert = await readFile(files[0]);
            form.setValue('caCert', new TextDecoder().decode(cert));
          }}
          disabled={!form.values.host.startsWith('https://')}
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

function resolveAddress(address: string, defaults = { protocol: 'https://', port: 9200 }) {
  const match = address.match(/^([a-z]+:\/\/)?([^:]+)(:([0-9]+))?/i);
  if (match) {
    const [input, protocol = defaults.protocol, hostname, , port = defaults.port] = match;
    return address.replace(input, `${protocol}${hostname}:${port}`);
  }
  return address;
}

function readFile(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
