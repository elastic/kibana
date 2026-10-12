/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowServiceAccount } from '../../../../entities/service_accounts';

export interface ServiceAccountEnvironment {
  isServerless: boolean;
  projectName?: string;
  projectId?: string;
  projectType?: string;
}

export const ServiceAccountRoles = ({ roles }: { roles: string[] }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
    {roles.length ? (
      roles.map((role) => (
        <EuiFlexItem key={role} grow={false}>
          <EuiBadge color="hollow" iconType="user">
            {role}
          </EuiBadge>
        </EuiFlexItem>
      ))
    ) : (
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="workflows.editor.serviceAccountNoRolesLabel"
          defaultMessage="No roles assigned"
        />
      </EuiTextColor>
    )}
  </EuiFlexGroup>
);

export const ServiceAccountDetails = ({
  account,
  environment,
}: {
  account: WorkflowServiceAccount;
  environment: ServiceAccountEnvironment;
}) => {
  const projectIcons: Record<string, string> = {
    security: 'logoSecurity',
    observability: 'logoObservability',
    search: 'logoElasticsearch',
  };
  const location = environment.isServerless
    ? environment.projectName ||
      i18n.translate('workflows.editor.serviceAccountProjectLabel', {
        defaultMessage: 'Current project',
      })
    : i18n.translate('workflows.editor.serviceAccountDeploymentLabel', {
        defaultMessage: 'This deployment',
      });
  const icon = environment.isServerless
    ? (projectIcons[environment.projectType ?? ''] ?? 'logoElastic')
    : 'logoKibana';
  return (
    <EuiText
      size="s"
      data-test-subj="serviceAccountDetails"
      css={css({ overflowWrap: 'anywhere' })}
    >
      <strong>{account.name}</strong>
      <EuiSpacer size="s" />
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="workflows.editor.serviceAccountIdLabel"
          defaultMessage="ID: {id}"
          values={{ id: account.id }}
        />
      </EuiTextColor>
      <EuiSpacer size="m" />
      <strong>
        <FormattedMessage id="workflows.editor.serviceAccountRolesLabel" defaultMessage="Roles" />
      </strong>
      <EuiSpacer size="xs" />
      <ServiceAccountRoles roles={account.roles} />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} data-test-subj="serviceAccountEnvironmentIcon" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <span title={environment.isServerless ? environment.projectId : undefined}>
            {location}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBadge color={account.enabled ? 'success' : 'warning'}>
        <FormattedMessage
          id="workflows.editor.serviceAccountStatusLabel"
          defaultMessage="{enabled, select, true {Enabled} other {Disabled}}"
          values={{ enabled: String(account.enabled) }}
        />
      </EuiBadge>
      {(!account.enabled || !account.assumable) && (
        <>
          <EuiSpacer size="s" />
          <EuiTextColor color="warning">
            <FormattedMessage
              id="workflows.editor.serviceAccountUnavailableDescription"
              defaultMessage="This account cannot run workflows."
            />
          </EuiTextColor>
        </>
      )}
    </EuiText>
  );
};
