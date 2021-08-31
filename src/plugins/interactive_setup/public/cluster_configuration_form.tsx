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

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { IHttpFetchError } from 'kibana/public';

import type { Certificate } from '../common';
import { TextTruncate } from './text_truncate';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useHtmlId } from './use_html_id';
import { useHttp } from './use_http';

export interface ClusterConfigurationFormValues {
  username: string;
  password: string;
  caCert: string;
}

export interface ClusterConfigurationFormProps {
  host: string;
  authRequired: boolean;
  certificateChain?: Certificate[];
  defaultValues?: ClusterConfigurationFormValues;
  onCancel?(): void;
  onSuccess?(): void;
}

export const ClusterConfigurationForm: FunctionComponent<ClusterConfigurationFormProps> = ({
  host,
  authRequired,
  certificateChain,
  defaultValues = {
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
    validate: async (values) => {
      const errors: ValidationErrors<ClusterConfigurationFormValues> = {};

      if (authRequired) {
        if (!values.username) {
          errors.username = i18n.translate(
            'interactiveSetup.clusterConfigurationForm.usernameRequiredError',
            {
              defaultMessage: 'Enter a username.',
            }
          );
        } else if (values.username === 'elastic') {
          errors.username = i18n.translate(
            'interactiveSetup.clusterConfigurationForm.usernameReservedError',
            {
              defaultMessage: "User 'elastic' can't be used as Kibana system user.",
            }
          );
        }

        if (!values.password) {
          errors.password = i18n.translate(
            'interactiveSetup.clusterConfigurationForm.passwordRequiredError',
            {
              defaultMessage: `Enter a password.`,
            }
          );
        }
      }

      if (certificateChain && !values.caCert) {
        errors.caCert = i18n.translate(
          'interactiveSetup.clusterConfigurationForm.caCertConfirmationRequiredError',
          {
            defaultMessage: 'Confirm that you recognize and trust this certificate.',
          }
        );
      }

      return errors;
    },
    onSubmit: async (values) => {
      await http.post('/internal/interactive_setup/configure', {
        body: JSON.stringify({
          host,
          username: values.username,
          password: values.password,
          caCert: values.caCert,
        }),
      });
      onSuccess?.();
    },
  });

  const trustCaCertId = useHtmlId('clusterConfigurationForm', 'trustCaCert');

  return (
    <EuiForm component="form" noValidate {...eventHandlers}>
      {form.submitError && (
        <>
          <EuiCallOut
            color="danger"
            title={i18n.translate('interactiveSetup.clusterConfigurationForm.submitErrorTitle', {
              defaultMessage: "Couldn't connect to cluster",
            })}
          >
            {(form.submitError as IHttpFetchError).body?.message}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false} className="eui-textNoWrap">
          <FormattedMessage
            id="interactiveSetup.clusterConfigurationForm.connectTo"
            defaultMessage="Connect to"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ overflow: 'hidden' }}>
          <TextTruncate>
            <strong>{host}</strong>
          </TextTruncate>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />

      {authRequired ? (
        <>
          <EuiFormRow
            label={i18n.translate('interactiveSetup.clusterConfigurationForm.usernameLabel', {
              defaultMessage: 'Username',
            })}
            error={form.errors.username}
            isInvalid={form.touched.username && !!form.errors.username}
            fullWidth
          >
            <EuiFieldText
              icon="user"
              name="username"
              value={form.values.username}
              isInvalid={form.touched.username && !!form.errors.username}
              fullWidth
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('interactiveSetup.clusterConfigurationForm.passwordLabel', {
              defaultMessage: 'Password',
            })}
            error={form.errors.password}
            isInvalid={form.touched.password && !!form.errors.password}
            fullWidth
          >
            <EuiFieldPassword
              type="dual"
              name="password"
              value={form.values.password}
              isInvalid={form.touched.password && !!form.errors.password}
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer />
        </>
      ) : (
        <>
          <EuiCallOut
            color="warning"
            title={i18n.translate(
              'interactiveSetup.clusterConfigurationForm.insecureClusterTitle',
              {
                defaultMessage: 'This cluster is not secure.',
              }
            )}
          >
            <p>
              <FormattedMessage
                id="interactiveSetup.clusterConfigurationForm.insecureClusterDescription"
                defaultMessage="Anyone with the address could access your data."
              />
            </p>
            <p>
              <EuiLink color="warning">
                <FormattedMessage
                  id="interactiveSetup.clusterConfigurationForm.insecureClusterLink"
                  defaultMessage="Learn how to enable security features."
                />
              </EuiLink>
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      {certificateChain && certificateChain.length > 0 && (
        <>
          <EuiFormRow
            label={i18n.translate('interactiveSetup.clusterConfigurationForm.caCertLabel', {
              defaultMessage: 'Certificate authority',
            })}
            error={form.errors.caCert}
            isInvalid={form.touched.caCert && !!form.errors.caCert}
            fullWidth
          >
            <EuiCheckableCard
              id={trustCaCertId}
              label={i18n.translate('interactiveSetup.clusterConfigurationForm.trustCaCertLabel', {
                defaultMessage: 'I recognize and trust this certificate:',
              })}
              checkableType="checkbox"
              value="true"
              checked={!!form.values.caCert}
              onChange={() => {
                const intermediateCa = certificateChain[Math.min(1, certificateChain.length - 1)];
                form.setValue('caCert', form.values.caCert ? '' : intermediateCa.raw);
                form.setTouched('caCert');
              }}
            >
              <CertificatePanel certificate={certificateChain[0]} />
            </EuiCheckableCard>
          </EuiFormRow>
          <EuiSpacer />
        </>
      )}

      <EuiFlexGroup responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="right" iconType="arrowLeft" onClick={onCancel}>
            <FormattedMessage
              id="interactiveSetup.clusterConfigurationForm.cancelButton"
              defaultMessage="Back"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            type="submit"
            isLoading={form.isSubmitting}
            isDisabled={form.isSubmitted && form.isInvalid}
            color="primary"
            fill
          >
            <FormattedMessage
              id="interactiveSetup.clusterConfigurationForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Connecting to cluster…} other{Connect to cluster}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
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
                issuer: certificate.issuer.O || certificate.issuer.CN,
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
