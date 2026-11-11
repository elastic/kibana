/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiButtonIcon, EuiCopy, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useServiceAccount } from '../model/use_service_account_directory';

const getShortName = (id: string): string => id.slice(id.lastIndexOf('/') + 1) || id;

/** Shows a service account by its short name, with the full ID in a tooltip and a copy button. */
export const ServiceAccountName = ({ id }: { id: string }) => {
  const account = useServiceAccount(id);
  const { euiTheme } = useEuiTheme();
  const available = account?.enabled && account.assumable;
  const copyLabel = i18n.translate('workflows.serviceAccount.copyIdButtonLabel', {
    defaultMessage: 'Copy service account ID',
  });
  const unavailableLabel = i18n.translate('workflows.serviceAccount.unavailableTooltip', {
    defaultMessage: 'Service account is disabled or unavailable for workload execution',
  });

  const renderName = () => {
    // The directory lookup needs manage_security. Without it, only the ID is known.
    if (!account?.name) {
      return <span css={{ overflowWrap: 'anywhere', minWidth: 0 }}>{getShortName(id)}</span>;
    }
    if (available) {
      return (
        <EuiBadge color="success" iconType="check" data-test-subj="workflowServiceAccountResolved">
          {account.name}
        </EuiBadge>
      );
    }
    return (
      <EuiBadge
        color="hollow"
        iconType="warning"
        data-test-subj="workflowServiceAccountUnavailable"
      >
        {account.name}
      </EuiBadge>
    );
  };

  return (
    <span
      data-test-subj="workflowServiceAccountName"
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: euiTheme.size.xs,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <EuiToolTip
        anchorProps={{ css: { display: 'flex', minWidth: 0 } }}
        content={
          account?.name && !available ? (
            <>
              {id}
              <br />
              {unavailableLabel}
            </>
          ) : (
            id
          )
        }
      >
        <span tabIndex={0} css={{ display: 'inline-flex', minWidth: 0, maxWidth: '100%' }}>
          {renderName()}
        </span>
      </EuiToolTip>
      <EuiCopy textToCopy={id}>
        {(copy) => (
          <EuiToolTip
            content={copyLabel}
            disableScreenReaderOutput
            anchorProps={{ css: { flexShrink: 0 } }}
          >
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
    </span>
  );
};
