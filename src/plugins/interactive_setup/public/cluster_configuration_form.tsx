/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';

import type { Certificate } from '../common';
import { DocLink } from './doc_link';
import { getCommandLineSnippet } from './get_command_line_snippet';
import { SubmitErrorCallout } from './submit_error_callout';
import { TextTruncate } from './text_truncate';
import type { ValidationErrors } from './use_form';
import { useForm } from './use_form';
import { useHtmlId } from './use_html_id';
import { useKibana } from './use_kibana';
import { useVerification } from './use_verification';
import { useVisibility } from './use_visibility';

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
  const { http } = useKibana();
  const { status, getCode } = useVerification();
  const [form, eventHandlers] = useForm({
    defaultValues,
    validate: (values) => {
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
              defaultMessage: "User 'elastic' can't be used as the Kibana system user.",
            }
          );
        }

        if (!values.password) {
          errors.password = i18n.translate(
            'interactiveSetup.clusterConfigurationForm.passwordRequiredError',
            {
              defaultMessage: 'Enter a password.',
            }
          );
        }
      }

      if (certificateChain && certificateChain.length > 0 && !values.caCert) {
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
          username: authRequired ? values.username : undefined,
          password: authRequired ? values.password : undefined,
          caCert: certificateChain && certificateChain.length > 0 ? values.caCert : undefined,
          code: getCode(),
        }),
      });
      onSuccess?.();
    },
  });
  const [isVisible, buttonRef] = useVisibility<HTMLButtonElement>();
  const trustCaCertId = useHtmlId('clusterConfigurationForm', 'trustCaCert');

  useUpdateEffect(() => {
    if (status === 'verified' && isVisible) {
      form.submit();
    }
  }, [status]);

  return (
    <EuiForm component="form" noValidate {...eventHandlers}>
      {status !== 'unverified' && !form.isSubmitting && !form.isValidating && form.submitError && (
        <>
          <SubmitErrorCallout
            error={form.submitError}
            defaultTitle={i18n.translate(
              'interactiveSetup.clusterConfigurationForm.submitErrorTitle',
              {
                defaultMessage: "Couldn't configure Elastic",
              }
            )}
          />
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
            helpText={
              form.errors.username ? undefined : (
                <ForgotPasswordPopover username={form.values.username} />
              )
            }
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
            iconType="alert"
            title={i18n.translate(
              'interactiveSetup.clusterConfigurationForm.insecureClusterTitle',
              {
                defaultMessage: 'This cluster is not secure',
              }
            )}
            size="s"
          >
            <FormattedMessage
              tagName="div"
              id="interactiveSetup.clusterConfigurationForm.insecureClusterDescription"
              defaultMessage="Anyone with the address can access your data."
            />
            <EuiSpacer size="xs" />
            <DocLink app="elasticsearch" doc="configuring-stack-security.html">
              <FormattedMessage
                id="interactiveSetup.clusterConfigurationForm.insecureClusterLink"
                defaultMessage="Learn how to enable security features."
              />
            </DocLink>
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
                const rootCa = certificateChain[certificateChain.length - 1];
                form.setTouched('caCert');
                form.setValue('caCert', form.values.caCert ? '' : rootCa.raw);
              }}
            >
              <CertificateChain certificateChain={certificateChain} />
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
            buttonRef={buttonRef}
            type="submit"
            isLoading={form.isSubmitting}
            isDisabled={form.isSubmitted && form.isInvalid}
            color="primary"
            fill
          >
            <FormattedMessage
              id="interactiveSetup.clusterConfigurationForm.submitButton"
              defaultMessage="{isSubmitting, select, true{Configuring Elastic…} other{Configure Elastic}}"
              values={{ isSubmitting: form.isSubmitting }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

export interface CertificatePanelProps {
  certificate: Omit<Certificate, 'raw'>;
  compressed?: boolean;
  type?: 'root' | 'intermediate';
  onClick?(): void;
}

export const CertificatePanel: FunctionComponent<CertificatePanelProps> = ({
  certificate,
  onClick,
  type,
  compressed = false,
}) => {
  return (
    <EuiPanel color={compressed ? 'subdued' : undefined} hasBorder={!compressed}>
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiIcon type="document" size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup responsive={false} gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>{certificate.subject.O || certificate.subject.CN}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {!compressed && (
              <EuiFlexItem grow={false}>
                <EuiBadge>
                  {type === 'root'
                    ? i18n.translate('interactiveSetup.certificatePanel.rootCertificateAuthority', {
                        defaultMessage: 'Root CA',
                      })
                    : type === 'intermediate'
                    ? i18n.translate(
                        'interactiveSetup.certificatePanel.intermediateCertificateAuthority',
                        {
                          defaultMessage: 'Intermediate CA',
                        }
                      )
                    : i18n.translate('interactiveSetup.certificatePanel.serverCertificate', {
                        defaultMessage: 'Server certificate',
                      })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {compressed && (
            <EuiText size="xs">
              <FormattedMessage
                id="interactiveSetup.certificatePanel.issuer"
                defaultMessage="Issued by: {issuer}"
                values={{
                  issuer: onClick ? (
                    <EuiLink onClick={onClick}>
                      {certificate.issuer.O || certificate.issuer.CN}
                    </EuiLink>
                  ) : (
                    certificate.issuer.O || certificate.issuer.CN
                  ),
                }}
              />
            </EuiText>
          )}
          {!compressed && (
            <EuiText size="xs">
              <FormattedMessage
                id="interactiveSetup.certificatePanel.validFrom"
                defaultMessage="Issued on: {validFrom}"
                values={{
                  validFrom: certificate.valid_from,
                }}
              />
            </EuiText>
          )}
          <EuiText size="xs">
            <FormattedMessage
              id="interactiveSetup.certificatePanel.validTo"
              defaultMessage="Expires on: {validTo}"
              values={{
                validTo: certificate.valid_to,
              }}
            />
          </EuiText>
          {!compressed && (
            <EuiText size="xs">
              <FormattedMessage
                id="interactiveSetup.certificatePanel.fingerprint"
                defaultMessage="Fingerprint (SHA-256): {fingerprint}"
                values={{
                  fingerprint: certificate.fingerprint256.replace(/\:/g, ' '),
                }}
              />
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export interface CertificateChainProps {
  certificateChain: Certificate[];
}
const CertificateChain: FunctionComponent<CertificateChainProps> = ({ certificateChain }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <CertificatePanel
        certificate={certificateChain[0]}
        onClick={() => setShowModal(true)}
        compressed
      />
      {showModal && (
        <EuiModal onClose={() => setShowModal(false)} maxWidth={euiThemeVars.euiBreakpoints.s}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="interactiveSetup.certificateChain.title"
                defaultMessage="Certificate chain"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {certificateChain
              .slice()
              .reverse()
              .map(({ raw, ...certificate }, i) => (
                <>
                  {i > 0 && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiFlexGroup responsive={false} justifyContent="center">
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="sortDown" color="subdued" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="s" />
                    </>
                  )}
                  <CertificatePanel
                    certificate={certificate}
                    type={
                      i === 0
                        ? 'root'
                        : i < certificateChain.length - 1
                        ? 'intermediate'
                        : undefined
                    }
                  />
                </>
              ))}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton fill onClick={() => setShowModal(false)}>
              <FormattedMessage
                id="interactiveSetup.certificateChain.cancelButton"
                defaultMessage="Close"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

export interface ForgotPasswordPopoverProps {
  username: string;
}

export const ForgotPasswordPopover: FunctionComponent<ForgotPasswordPopoverProps> = ({
  username,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (
    <EuiLink onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}>
      <FormattedMessage
        id="interactiveSetup.forgotPasswordPopover.buttonText"
        defaultMessage="Forgot password?"
      />
    </EuiLink>
  );

  return (
    <EuiPopover
      button={button}
      anchorPosition="rightCenter"
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiText size="s" grow={false}>
        <p>
          <FormattedMessage
            id="interactiveSetup.forgotPasswordPopover.helpText"
            defaultMessage="To reset the password for the {username} user, run the following command from
          the Elasticsearch installation directory:"
            values={{
              username: <strong>{username}</strong>,
            }}
          />
        </p>
        <EuiCodeBlock language="bash" paddingSize="m" isCopyable>
          {getCommandLineSnippet('elasticsearch-reset-password', `--username ${username}`)}
        </EuiCodeBlock>
      </EuiText>
    </EuiPopover>
  );
};
