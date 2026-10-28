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
  EuiButtonIcon,
  EuiCopy,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ServiceAccountWorkload } from '../model/service_account_directory';
import { useWorkloadServiceAccount } from '../model/use_service_account_directory';

/**
 * Shows the account `id`, with its name when the workload reports that account. The name comes
 * from the workload rather than the service account directory, so users who can see the workload
 * but cannot manage service accounts still see it.
 */
export const ServiceAccountName = ({
  id,
  workload,
}: {
  id: string;
  workload?: ServiceAccountWorkload;
}) => {
  const account = useWorkloadServiceAccount(id, workload);
  const { euiTheme } = useEuiTheme();
  const available = account?.enabled && account.assumable;
  const copyLabel = i18n.translate('workflows.serviceAccount.copyIdButtonLabel', {
    defaultMessage: 'Copy service account ID',
  });
  return (
    <span
      data-test-subj="workflowServiceAccountName"
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: euiTheme.size.xs,
      }}
    >
      {account?.name &&
        (available ? (
          <EuiBadge
            color="success"
            iconType="check"
            data-test-subj="workflowServiceAccountResolved"
          >
            {account.name}
          </EuiBadge>
        ) : (
          <EuiToolTip
            content={i18n.translate('workflows.serviceAccount.unavailableTooltip', {
              defaultMessage: 'Service account is disabled or unavailable for workload execution',
            })}
          >
            <span tabIndex={0}>
              <EuiBadge
                color="hollow"
                iconType="warning"
                data-test-subj="workflowServiceAccountUnavailable"
              >
                {account.name}
              </EuiBadge>
            </span>
          </EuiToolTip>
        ))}
      <EuiTextColor
        color={account?.name ? 'subdued' : 'default'}
        css={{ overflowWrap: 'anywhere' }}
      >
        {id}
      </EuiTextColor>
      {account?.name && (
        <EuiCopy textToCopy={id}>
          {(copy) => (
            <EuiToolTip content={copyLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                size="xs"
                color="text"
                aria-label={copyLabel}
                onClick={copy}
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      )}
    </span>
  );
};
