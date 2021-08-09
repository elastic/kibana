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
  EuiCheckableCard,
  EuiFieldPassword,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { euiThemeVars } from '@kbn/ui-shared-deps/theme';

import type { Certificate, PingResponse } from '../common/types';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
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

  const [state, pingCluster] = useAsyncFn(async (values: ManualConfigurationFormValues) => {
    const requiresCert = values.host.trim().startsWith('https://');
    let requiresAuth = false;
    let body: PingResponse;

    try {
      const response = await http.post<PingResponse>('/internal/interactive_setup/ping', {
        body: JSON.stringify({
          hosts: [values.host],
        }),
        asResponse: true,
      });
      body = response.body!;
    } catch (error) {
      if (error.response?.status !== 401) {
        throw error;
      }
      requiresAuth = true;
      body = error.body;
    }

    return { requiresCert, requiresAuth, ...body };
  });

  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: async (values) => {
      const errors: ValidationErrors<typeof values> = {};

      let requiresAuth = false;
      let requiresCert = false;
      let needsToUploadCert = false;

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
          if (url.protocol === 'https:') {
            requiresCert = true;
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

      if (!errors.host) {
        try {
          const data = await pingCluster(values);
          if (data instanceof Error) {
            throw data;
          }
          const { statusCode, certificateChain } = data;
          requiresAuth = statusCode === 401;
          needsToUploadCert = !certificateChain?.length;
        } catch (error) {
          errors.host = i18n.translate(
            'interactiveSetup.manualConfigurationForm.hostConnectionError',
            {
              defaultMessage: "Can't connect to this cluster.",
            }
          );
        }
      }

      if (requiresAuth) {
        if (!values.username) {
          errors.username = i18n.translate(
            'interactiveSetup.manualConfigurationForm.usernameRequiredError',
            {
              defaultMessage: 'Enter a username.',
            }
          );
        } else if (values.username === 'elastic') {
          errors.username = i18n.translate(
            'interactiveSetup.manualConfigurationForm.usernameReservedError',
            {
              defaultMessage: "User 'elastic' can't be used as Kibana system user.",
            }
          );
        }

        if (!values.password) {
          errors.password = i18n.translate(
            'interactiveSetup.manualConfigurationForm.passwordRequiredError',
            {
              defaultMessage: `Enter a password.`,
            }
          );
        }
      }

      if (requiresCert && !values.caCert) {
        if (needsToUploadCert) {
          errors.caCert = i18n.translate(
            'interactiveSetup.manualConfigurationForm.caCertRequiredError',
            {
              defaultMessage: 'Upload a trusted CA certificate.',
            }
          );
        } else {
          errors.caCert = i18n.translate(
            'interactiveSetup.manualConfigurationForm.caCertConfirmationRequiredError',
            {
              defaultMessage: 'Confirm that you recognize and trust this certificate.',
            }
          );
        }
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
          form.setError('caCert', 'Certificate is not valid for this cluster.');
        } else if (error.body?.message.includes('unable to authenticate user')) {
          form.setError('password', 'Invalid username or password.');
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
      {state.value?.statusCode === 200 && (
        <>
          <EuiCallOut
            color="warning"
            title={i18n.translate('interactiveSetup.manualConfigurationForm.insecureClusterTitle', {
              defaultMessage: 'Your cluster is not secure.',
            })}
          >
            <p>
              <FormattedMessage
                id="interactiveSetup.manualConfigurationForm.insecureClusterDescription"
                defaultMessage="Anyone with the address could access your data."
              />
            </p>
            <p>
              <EuiLink>
                <FormattedMessage
                  id="interactiveSetup.manualConfigurationForm.insecureClusterLink"
                  defaultMessage="Learn how to enable security features."
                />
              </EuiLink>
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiFormRow
        label={i18n.translate('interactiveSetup.manualConfigurationForm.hostLabel', {
          defaultMessage: 'Address',
        })}
        error={form.errors.host}
        isInvalid={form.touched.host && !!form.errors.host}
      >
        <EuiFieldText
          name="host"
          value={form.values.host}
          isInvalid={form.touched.host && !!form.errors.host}
          isLoading={form.isValidating}
        />
      </EuiFormRow>

      {state.value?.statusCode === 401 && (
        <>
          <EuiFormRow
            label={i18n.translate('interactiveSetup.manualConfigurationForm.usernameLabel', {
              defaultMessage: 'Username',
            })}
            error={form.errors.username}
            isInvalid={form.touched.username && !!form.errors.username}
          >
            <EuiFieldText
              icon="user"
              name="username"
              value={form.values.username}
              isInvalid={form.touched.username && !!form.errors.username}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('interactiveSetup.manualConfigurationForm.passwordLabel', {
              defaultMessage: 'Password',
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
        </>
      )}

      {state.value && form.values.host.trim().startsWith('https://') && (
        <EuiFormRow
          label={i18n.translate('interactiveSetup.manualConfigurationForm.caCertLabel', {
            defaultMessage: 'Certificate authority',
          })}
          error={form.errors.caCert}
          isInvalid={form.touched.caCert && !!form.errors.caCert}
        >
          {state.value.certificateChain ? (
            <EuiCheckableCard
              id="trustCaCert"
              label={i18n.translate('interactiveSetup.manualConfigurationForm.trustCaCertLabel', {
                defaultMessage: 'I recognize and trust this certificate:',
              })}
              checkableType="checkbox"
              value="true"
              checked={!!form.values.caCert}
              onChange={async (event) => {
                const intermediateCa =
                  state.value?.certificateChain?.[
                    Math.min(1, state.value.certificateChain.length - 1)
                  ].raw;
                await form.setValue('caCert', event.target.checked ? intermediateCa ?? '' : '');
                form.setTouched('caCert');
              }}
            >
              <CertificatePanel certificate={state.value.certificateChain[0]} />
            </EuiCheckableCard>
          ) : (
            <EuiFilePicker
              name="caCert"
              isInvalid={form.touched.caCert && !!form.errors.caCert}
              accept=".pem,.crt,.cert"
              onChange={async (files) => {
                if (!files || !files.length) {
                  await form.setValue('caCert', '');
                  return;
                }
                if (files[0].type !== 'application/x-x509-ca-cert') {
                  form.setError('caCert', 'Invalid certificate, upload x509 CA cert in PEM format');
                  return;
                }
                const cert = await readFile(files[0]);
                await form.setValue('caCert', cert);
                form.setTouched('caCert');
              }}
            />
          )}
        </EuiFormRow>
      )}
      <EuiSpacer />

      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="right" iconType="arrowLeft" onClick={onCancel}>
            <FormattedMessage
              id="interactiveSetup.manualConfigurationForm.cancelButton"
              defaultMessage="Back"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {state.value ? (
            <EuiButton
              type="submit"
              isLoading={form.isSubmitting}
              isDisabled={form.isSubmitted && form.isInvalid}
              color={state.value.statusCode === 200 ? 'warning' : 'primary'}
              fill
            >
              {state.value.statusCode === 200 ? (
                <FormattedMessage
                  id="interactiveSetup.manualConfigurationForm.submitWarningButton"
                  defaultMessage="{isSubmitting, select, true{Connecting to cluster…} other{Connect anyways}}"
                  values={{ isSubmitting: form.isSubmitting }}
                />
              ) : (
                <FormattedMessage
                  id="interactiveSetup.manualConfigurationForm.submitButton"
                  defaultMessage="{isSubmitting, select, true{Connecting to cluster…} other{Connect to cluster}}"
                  values={{ isSubmitting: form.isSubmitting }}
                />
              )}
            </EuiButton>
          ) : (
            <EuiButton
              type="button"
              onClick={() => form.setTouched('host')}
              isLoading={form.isValidating}
              fill
            >
              <FormattedMessage
                id="interactiveSetup.manualConfigurationForm.validateButton"
                defaultMessage="{isValidating, select, true{Getting cluster info…} other{Get cluster info}}"
                values={{ isValidating: form.isValidating }}
              />
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

export interface CertificatePanelProps {
  certificate: Certificate;
}

export const CertificatePanel: FunctionComponent<CertificatePanelProps> = ({ certificate }) => {
  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiIcon type="document" size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>{certificate.subject.O || certificate.subject.CN}</h3>
          </EuiTitle>
          <EuiText size="xs">
            <FormattedMessage
              id="interactiveSetup.certificatePanel.issuer"
              defaultMessage="Issued by: {issuer}"
              values={{
                issuer: <EuiLink>{certificate.issuer.O || certificate.issuer.CN}</EuiLink>,
              }}
            />
          </EuiText>
          <EuiText size="xs">
            <FormattedMessage
              id="interactiveSetup.certificatePanel.validTo"
              defaultMessage="Expires: {validTo}"
              values={{
                validTo: certificate.valid_to,
              }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(new TextDecoder().decode(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
