/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiPageTemplate,
  EuiIcon,
  EuiForm,
  EuiButton,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiHorizontalRule,
  EuiTextArea,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiFieldText,
  EuiFieldPassword,
  EuiFilePicker,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { euiThemeVars } from '@kbn/ui-shared-deps/theme';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useForm, ValidationErrors } from './use_form';
import { useKibana } from '../../../../src/plugins/kibana_react/public';
import { getFingerprint } from './get_fingerprint';
import { decodeEnrollmentToken } from './decode_enrollment_token';

export const App = () => {
  return (
    <EuiPageTemplate
      template="centeredBody"
      pageHeader={{
        iconType: 'logoElastic',
        pageTitle: 'Configure Elastic to get started',
      }}
    >
      <EuiTitle>
        <h2>Connect to cluster</h2>
      </EuiTitle>
      <EuiSpacer />
      <ConfigurationForm />
    </EuiPageTemplate>
  );
};

interface ConfigurationFormValues {
  type: 'enrollmentToken' | 'manual' | string;
  enrollmentToken: string;
  address: string;
  username: string;
  password: string;
  ca: string;
}

interface ConfigurationFormProps {
  defaultValues?: ConfigurationFormValues;
  onCancel(): void;
  onSuccess?(): void;
}

const defaultDefaultValues: ConfigurationFormValues = {
  type: 'enrollmentToken',
  enrollmentToken: '',
  address: 'localhost:9201',
  username: 'elastic',
  password: '',
  ca: '',
};

const ConfigurationForm: FunctionComponent<ConfigurationFormProps> = ({
  defaultValues = defaultDefaultValues,
  onSuccess,
  onCancel,
}) => {
  const { services } = useKibana();
  const [state, enrollKibana] = useAsyncFn((enrollmentToken: string) =>
    services.http!.post('/internal/user_setup', {
      body: JSON.stringify({ enrollmentToken }),
    })
  );
  const [form, eventHandlers] = useForm({
    onSubmit: async (values) => {
      const decoded = decodeEnrollmentToken(values.enrollmentToken);
      if (decoded) {
        await enrollKibana(values.enrollmentToken);
        // const result = await services.http!.get('/internal/security/enroll/kibana', {
        //   headers: {
        //     Authorization: `ApiKey ${btoa(decoded.key)}`,
        //   },
        // });
      }
    },
    validate: (values) => {
      const errors: ValidationErrors<typeof values> = {};

      if (!values.enrollmentToken) {
        errors.enrollmentToken = 'Required';
      } else {
        const decoded = decodeEnrollmentToken(values.enrollmentToken);
        if (!decoded) {
          errors.enrollmentToken = 'Invalid';
        }
      }

      return errors;
    },
    defaultValues,
  });

  const decoded = decodeEnrollmentToken(form.values.enrollmentToken);

  return (
    <EuiForm
      component="form"
      {...eventHandlers}
      noValidate
      style={{ width: euiThemeVars.euiFormMaxWidth }}
    >
      {/* <EuiFormRow fullWidth>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="tokenKey" color="text" />}
              title="Connect using enrollment token"
              description={false}
              selectable={{
                onClick: () => {
                  form.setValue('type', 'enrollmentToken');
                },
                isSelected: form.values.type === 'enrollmentToken',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="gear" />}
              title="Configure manually"
              description={false}
              selectable={{
                onClick: () => {
                  form.setValue('type', 'manual');
                },
                isSelected: form.values.type === 'manual',
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow> */}

      {form.values.type && (
        <>
          {form.values.type === 'enrollmentToken' && (
            <>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.security.management.users.userForm.enrollmentTokenLabel',
                  {
                    defaultMessage: 'Enrollment token',
                  }
                )}
                error={form.errors.enrollmentToken}
                isInvalid={form.touched.enrollmentToken && !!form.errors.enrollmentToken}
                helpText={
                  decoded && (
                    <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">Connect to</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="lock" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">{decoded.adr[0]}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="logoElasticsearch" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">{`Elasticsearch (v${decoded.ver})`}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )
                }
              >
                <EuiTextArea
                  name="enrollmentToken"
                  value={form.values.enrollmentToken}
                  isInvalid={form.touched.enrollmentToken && !!form.errors.enrollmentToken}
                  placeholder={i18n.translate(
                    'xpack.security.management.users.userForm.enrollmentTokenHelpText',
                    {
                      defaultMessage: 'Paste enrollment token from terminal',
                    }
                  )}
                  style={{
                    fontFamily: euiThemeVars.euiCodeFontFamily,
                    fontSize: euiThemeVars.euiFontSizeXS,
                  }}
                  onKeyUp={() =>
                    form.setValue(
                      'enrollmentToken',
                      btoa(
                        JSON.stringify({
                          ver: '8.0.0',
                          adr: ['localhost:9200'],
                          fgr:
                            '48:CC:6C:F8:76:43:3C:97:85:B6:24:45:5B:FF:BD:40:4B:D6:35:81:51:E7:A9:99:60:E4:0A:C8:8D:AE:5C:4D',
                          key: 'fECUqXoB0XsCTgc6NjlA:jo5CEpRURPGq7_Xi6G5uEA',
                        })
                      )
                    )
                  }
                />
              </EuiFormRow>
              <EuiSpacer />
            </>
          )}

          {form.values.type === 'manual' && (
            <>
              <EuiFormRow
                label={i18n.translate('xpack.security.management.users.userForm.addressLabel', {
                  defaultMessage: 'Elasticsearch address',
                })}
                error={form.errors.address}
                isInvalid={form.touched.address && !!form.errors.address}
              >
                <EuiFieldText
                  name="address"
                  value={form.values.address}
                  isInvalid={form.touched.address && !!form.errors.address}
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.security.management.users.userForm.usernameLabel', {
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
                label={i18n.translate('xpack.security.management.users.userForm.passwordLabel', {
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
                label={i18n.translate('xpack.security.management.users.userForm.caLabel', {
                  defaultMessage: 'Elasticsearch certificate authority',
                })}
                error={form.errors.ca}
                isInvalid={form.touched.ca && !!form.errors.ca}
                helpText={form.values.ca}
              >
                <EuiFilePicker
                  name="ca"
                  isInvalid={form.touched.ca && !!form.errors.ca}
                  accept=".pem,.crt,.cert"
                  onChange={async (files) => {
                    form.setTouched('ca');
                    if (!files || !files.length) {
                      form.setValue('ca', '');
                      return;
                    }
                    if (files[0].type !== 'application/x-x509-ca-cert') {
                      form.setError('ca', 'Invalid certificate, upload x509 CA cert');
                      return false;
                    }
                    const cert = await readFile(files[0]);
                    const hash = await getFingerprint(cert);
                    form.setValue('ca', hash);
                  }}
                />
              </EuiFormRow>
              <EuiSpacer />
            </>
          )}

          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                isLoading={form.isSubmitting}
                isDisabled={form.isSubmitted && form.isInvalid}
                fill
              >
                <FormattedMessage
                  id="xpack.security.management.users.userForm.updateUserButton"
                  defaultMessage="{isSubmitting, select, true{Connecting to cluster…} other{Connect to cluster}}"
                  values={{ isSubmitting: form.isSubmitting }}
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {form.values.type === 'manual' ? (
                <EuiButtonEmpty
                  flush="left"
                  onClick={() => form.setValue('type', 'enrollmentToken')}
                >
                  Connect using enrollment token
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty flush="left" onClick={() => form.setValue('type', 'manual')}>
                  Configure manually
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}

      {state.value && (
        <>
          <EuiHorizontalRule />
          <EuiLoadingSpinner size="xl" /> Initializing Elastic...
        </>
      )}
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
