/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiAccordion,
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInlineEditTitle,
  EuiPageTemplate,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { Field, Form, FormikProvider, useFormik } from 'formik';
import type { ChangeEvent } from 'react';
import React, { useEffect, useRef, useState } from 'react';

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { ConfigType } from './config';
import { useAuthenticator } from './role_switcher';

export const LoginPage = ({ config }: { config: ConfigType }) => {
  const { services } = useKibana<CoreStart>();
  const [roles, setRoles] = useState<string[]>([]);
  const [generatedRoles, setGeneratedRoles] = useState<string[]>([]);
  const isRolesDefined = () => roles.length > 0 || generatedRoles.length > 0;

  const [, switchCurrentUser] = useAuthenticator(true);
  const [connectors, setConnectors] = useState<Array<{ connectorId: string; name: string }>>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>(undefined);
  const [eisAvailable, setEisAvailable] = useState<boolean | null>(null);
  const [description, setDescription] = useState('');
  const [isGeneratingRole, setIsGeneratingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    payload?: object;
  } | null>(null);

  const handleGenerateRole = async () => {
    if (!description.trim()) return;
    setIsGeneratingRole(true);
    setRoleMessage(null);
    try {
      const result = await services.http.post<{
        roleName: string;
        kibana: object;
        elasticsearch: object;
      }>('/mock_idp/ai_generate_role', {
        body: JSON.stringify({ description, connectorId: selectedConnectorId }),
      });
      setGeneratedRoles((prev) => [...prev, result.roleName]);
      formik.setFieldValue('role', result.roleName);
      setRoleMessage({
        type: 'success',
        text: `Role "${result.roleName}" created`,
        payload: { kibana: result.kibana, elasticsearch: result.elasticsearch },
      });
    } catch (err) {
      setRoleMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Inference connector may not be configured.',
      });
    } finally {
      setIsGeneratingRole(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      // In UIAM we support only numeric usernames.
      username: config.uiam?.enabled ? '12345' : sanitizeUsername('Test User'),
      full_name: 'Test User',
      role: undefined,
    },
    async onSubmit(values) {
      if (!values.role) {
        return;
      }
      await switchCurrentUser({
        username: values.username,
        full_name: values.full_name,
        email: sanitizeEmail(values.full_name),
        roles: [values.role],
        url: window.location.href,
      });
    },
  });

  const formikRef = useRef(formik);

  useEffect(() => {
    formikRef.current = formik;
  }, [formik]);

  useEffect(() => {
    const fetchData = async () => {
      const [rolesResponse, connectorsResponse] = await Promise.all([
        services.http.get<{ roles: string[]; generatedRoles: string[] }>(
          '/mock_idp/supported_roles'
        ),
        services.http.get<{
          connectors: Array<{ connectorId: string; name: string }>;
          defaultConnectorId: string | null;
        }>('/mock_idp/ai_connectors'),
      ]);
      setRoles(rolesResponse.roles);
      setGeneratedRoles(rolesResponse.generatedRoles ?? []);
      formikRef.current.setFieldValue('role', rolesResponse.roles[0]);
      setConnectors(connectorsResponse.connectors);
      setSelectedConnectorId(connectorsResponse.defaultConnectorId ?? undefined);
      setEisAvailable(connectorsResponse.connectors.length > 0);
    };

    fetchData();
  }, [services]);

  return (
    <FormikProvider value={formik}>
      <EuiPageTemplate panelled={false}>
        <EuiPageTemplate.Section alignment="center">
          <Form>
            <EuiEmptyPrompt
              layout="vertical"
              color="plain"
              body={
                <>
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    justifyContent="center"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiAvatar name={formik.values.full_name || 'User'} size="l" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <Field
                        as={EuiInlineEditTitle}
                        name="full_name"
                        heading="h2"
                        inputAriaLabel="Edit name inline"
                        value={formik.values.full_name}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          formik.setFieldValue('full_name', event.target.value);
                        }}
                        onCancel={(previousValue: string) => {
                          formik.setFieldValue('full_name', previousValue);
                        }}
                        isReadOnly={formik.isSubmitting}
                        editModeProps={{
                          formRowProps: {
                            error: formik.errors.full_name,
                          },
                        }}
                        validate={(value: string) => {
                          if (value.trim().length === 0) {
                            return 'Name cannot be empty';
                          }
                        }}
                        isInvalid={!!formik.errors.full_name}
                        placeholder="Enter your name"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <Field
                    as={EuiInlineEditTitle}
                    name="username"
                    heading="h5"
                    type={config.uiam?.enabled ? 'number' : 'text'}
                    inputAriaLabel="Edit username inline"
                    value={formik.values.username}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      formik.setFieldValue(
                        'username',
                        config.uiam?.enabled
                          ? event.target.value
                          : sanitizeUsername(event.target.value)
                      );
                    }}
                    onCancel={(previousValue: string) => {
                      formik.setFieldValue('username', previousValue);
                    }}
                    isReadOnly={formik.isSubmitting}
                    editModeProps={{ formRowProps: { error: formik.errors.username } }}
                    validate={(value: string) => {
                      if (config.uiam?.enabled && !/^[1-9][0-9]*$/.test(value)) {
                        return 'Username should be a positive number';
                      }

                      if (value.trim().length === 0) {
                        return 'Username cannot be empty';
                      }
                    }}
                    isInvalid={!!formik.errors.username}
                    placeholder="Enter your numeric username"
                    css={{ width: 350 }}
                  />
                  <EuiSpacer size="m" />

                  <EuiFormRow error={formik.errors.role} isInvalid={!!formik.errors.role}>
                    <Field
                      as={EuiComboBox}
                      isLoading={!isRolesDefined()}
                      disabled={!isRolesDefined()}
                      name="role"
                      placeholder="Select your role"
                      singleSelection={{ asPlainText: true }}
                      options={[
                        ...roles.map((role) => ({ label: role })),
                        ...(generatedRoles.length > 0
                          ? [
                              { label: 'Generated', isGroupLabelOption: true },
                              ...generatedRoles.map((role) => ({ label: role })),
                            ]
                          : []),
                      ]}
                      selectedOptions={
                        formik.values.role ? [{ label: formik.values.role }] : undefined
                      }
                      onCreateOption={(value: string) => {
                        formik.setFieldValue('role', value);
                      }}
                      onChange={(selectedOptions: EuiComboBoxOptionOption[]) => {
                        formik.setFieldValue(
                          'role',
                          selectedOptions.length === 0 ? '' : selectedOptions[0].label
                        );
                      }}
                      validate={(value: string | undefined) => {
                        if (!value?.trim()) {
                          return 'Role cannot be empty';
                        }
                      }}
                      isInvalid={!!formik.errors.role}
                      isClearable={false}
                      fullWidth
                    />
                  </EuiFormRow>
                </>
              }
              actions={[
                <EuiButton
                  type="submit"
                  data-test-subj="loginButton"
                  disabled={!formik.isValid || !isRolesDefined()}
                  isLoading={formik.isSubmitting}
                  fill
                >
                  Log in
                </EuiButton>,
                <EuiButtonEmpty
                  aria-label="Show alternative login methods"
                  size="xs"
                  href={
                    services.http.basePath.publicBaseUrl
                      ? `${services.http.basePath.publicBaseUrl.replace(/\/+$/, '')}/login`
                      : services.http.basePath.prepend('/login')
                  }
                >
                  More login options
                </EuiButtonEmpty>,
              ]}
            />
            {eisAvailable && (
              <>
                <EuiSpacer size="m" />
                <EuiText size="s">
                  <strong>Want a custom role?</strong>
                </EuiText>
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={(e: React.FormEvent) => {
                e.preventDefault();
                setDescription(
                  'Read-only access to all, write access to dashboards in space_a and space_b'
                );
              }}
            >
              Run example
            </EuiButtonEmpty>
            <EuiSpacer size="s" />
            <EuiFormRow fullWidth>
              <EuiTextArea
                placeholder="Describe the role in natural language, e.g. read-only analyst for observability"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isGeneratingRole || formik.isSubmitting}
                rows={3}
                fullWidth
                resize="none"
                data-test-subj="descriptionInput"
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="s"
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
            >
              {connectors.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    compressed
                    options={connectors.map((c) => ({ value: c.connectorId, text: c.name }))}
                    value={selectedConnectorId}
                    onChange={(e) => setSelectedConnectorId(e.target.value)}
                    disabled={isGeneratingRole || formik.isSubmitting}
                    aria-label="Select inference connector"
                    data-test-subj="connectorSelect"
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={handleGenerateRole}
                  isLoading={isGeneratingRole}
                  disabled={!description.trim() || formik.isSubmitting}
                  iconType="sparkles"
                  data-test-subj="generateRoleButton"
                >
                  Generate Role
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            {roleMessage && (
              <>
                <EuiSpacer size="s" />
                {roleMessage.type === 'error' ? (
                  <EuiCallOut
                    announceOnMount
                    size="s"
                    color="danger"
                    title={roleMessage.text}
                    iconType="alert"
                  />
                ) : (
                  <EuiAccordion id="rolePayload" buttonContent={roleMessage.text} paddingSize="s">
                    <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
                      {JSON.stringify(roleMessage.payload, null, 2)}
                    </EuiCodeBlock>
                  </EuiAccordion>
                )}
              </>
            )}
              </>
            )}
          </Form>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </FormikProvider>
  );
};

const sanitizeUsername = (username: string) =>
  username.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
const sanitizeEmail = (email: string) => `${sanitizeUsername(email)}@elastic.co`;
