/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRunAsPrototype } from './context';
import { ALL_SERVICE_ACCOUNT_ROLES } from './types';

export const CreateServiceAccountFlyout = () => {
  const { isCreateFlyoutOpen, closeCreateFlyout, createAccount, accounts } = useRunAsPrototype();
  const titleId = useGeneratedHtmlId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState<Set<string>>(new Set(['workflow_executor']));

  const isValid = useMemo(() => {
    const trimmed = name.trim();
    return (
      /^[a-z0-9][a-z0-9-]{2,}$/.test(trimmed) &&
      roles.size > 0 &&
      !accounts.some((a) => a.id === trimmed && a.exists)
    );
  }, [name, roles, accounts]);

  if (!isCreateFlyoutOpen) {
    return null;
  }

  const toggleRole = (role: string) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  return (
    <EuiFlyout
      onClose={closeCreateFlyout}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="workflowRunAsCreateFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            <FormattedMessage
              id="workflows.runAsPrototype.create.title"
              defaultMessage="Create service account"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="workflows.runAsPrototype.create.lede"
              defaultMessage="A service account is a dedicated identity for automation. Workflows bound to it run with exactly these privileges, regardless of who triggers them."
            />
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFormRow
          label={i18n.translate('workflows.runAsPrototype.create.nameLabel', {
            defaultMessage: 'Name',
          })}
          helpText={i18n.translate('workflows.runAsPrototype.create.nameHelp', {
            defaultMessage:
              'Lowercase, hyphens allowed. This is what appears in the workflow and in execution details.',
          })}
          fullWidth
        >
          <EuiFieldText
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. svc-alert-triage"
            fullWidth
            data-test-subj="workflowRunAsCreateName"
            css={{ fontFamily: 'Roboto Mono, SFMono-Regular, Menlo, Consolas, monospace' }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('workflows.runAsPrototype.create.descLabel', {
            defaultMessage: 'Description',
          })}
          labelAppend={
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="workflows.runAsPrototype.create.optional"
                defaultMessage="Optional"
              />
            </EuiText>
          }
          fullWidth
        >
          <EuiFieldText
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={i18n.translate('workflows.runAsPrototype.create.descPlaceholder', {
              defaultMessage: 'What this account is for',
            })}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('workflows.runAsPrototype.create.rolesLabel', {
            defaultMessage: 'Roles',
          })}
          helpText={i18n.translate('workflows.runAsPrototype.create.rolesHelp', {
            defaultMessage: "Pick the smallest set that lets the workflow's steps succeed.",
          })}
          fullWidth
        >
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {ALL_SERVICE_ACCOUNT_ROLES.map((role) => {
              const on = roles.has(role);
              return (
                <EuiButtonEmpty
                  key={role}
                  size="xs"
                  color={on ? 'primary' : 'text'}
                  iconType={on ? 'check' : 'plus'}
                  onClick={() => toggleRole(role)}
                  css={{
                    border: '1px solid',
                    borderColor: on ? 'currentColor' : undefined,
                    fontFamily: 'Roboto Mono, SFMono-Regular, Menlo, Consolas, monospace',
                  }}
                >
                  {role}
                </EuiButtonEmpty>
              );
            })}
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiCallOut size="s" color="primary" iconType="info">
          <FormattedMessage
            id="workflows.runAsPrototype.create.bindNote"
            defaultMessage="Creating the account doesn't bind it. It'll be preselected in the workflow; the binding applies when you save the workflow."
          />
        </EuiCallOut>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeCreateFlyout}>
              <FormattedMessage
                id="workflows.runAsPrototype.create.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={!isValid}
              onClick={() => {
                createAccount({
                  id: name.trim(),
                  desc: description.trim(),
                  roles: [...roles],
                });
                setName('');
                setDescription('');
                setRoles(new Set(['workflow_executor']));
              }}
              data-test-subj="workflowRunAsCreateSubmit"
            >
              <FormattedMessage
                id="workflows.runAsPrototype.create.submit"
                defaultMessage="Create service account"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
