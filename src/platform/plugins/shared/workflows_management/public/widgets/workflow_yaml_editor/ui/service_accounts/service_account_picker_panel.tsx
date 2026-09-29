/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { PropsWithChildren } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../hooks/use_kibana';

interface Props {
  status: 'loading' | 'ready' | 'forbidden' | 'unavailable';
  hasSuggestions: boolean;
  filtered: boolean;
  onRetry: () => void;
  onCreate: () => void;
}

export const ServiceAccountPickerPanel = ({
  status,
  hasSuggestions,
  filtered,
  onRetry,
  onCreate,
  children,
}: PropsWithChildren<Props>) => {
  const { euiTheme } = useEuiTheme();
  const { application, docLinks, security } = useKibana().services;
  const canManage = application.capabilities.management?.security?.service_accounts;
  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        css={css({ padding: euiTheme.size.m, borderBottom: euiTheme.border.thin, flexShrink: 0 })}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="workflows.editor.serviceAccountPickerTitle"
                defaultMessage="Service accounts"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        {canManage && status !== 'forbidden' && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={application.getUrlForApp('management', { path: '/security/service_accounts' })}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              <FormattedMessage
                id="workflows.editor.manageServiceAccountsLinkText"
                defaultMessage="Manage"
              />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {status === 'ready' && hasSuggestions ? (
        children
      ) : (
        <EuiText size="s" css={css({ padding: euiTheme.size.m })}>
          {status === 'loading' && (
            <div role="status">
              <EuiLoadingSpinner size="s" />{' '}
              <FormattedMessage
                id="workflows.editor.loadingServiceAccountsDescription"
                defaultMessage="Loading service accounts…"
              />
            </div>
          )}
          {status === 'forbidden' && (
            <p role="status">
              <FormattedMessage
                id="workflows.editor.serviceAccountsRestrictedDescription"
                defaultMessage="Service accounts execute workloads without relying on individual user profiles. Ask your administrator for access."
              />
            </p>
          )}
          {status === 'unavailable' && (
            <>
              <p role="alert">
                <FormattedMessage
                  id="workflows.editor.loadServiceAccountsErrorMessage"
                  defaultMessage="Unable to load service accounts."
                />
              </p>
              <EuiButtonEmpty size="s" iconType="refresh" onClick={onRetry}>
                <FormattedMessage
                  id="workflows.editor.retryServiceAccountsButtonLabel"
                  defaultMessage="Try again"
                />
              </EuiButtonEmpty>
            </>
          )}
          {status === 'ready' && (
            <p role="status">
              {filtered ? (
                <FormattedMessage
                  id="workflows.editor.noMatchingServiceAccountsDescription"
                  defaultMessage="No matching service accounts."
                />
              ) : (
                <FormattedMessage
                  id="workflows.editor.noAvailableServiceAccountsDescription"
                  defaultMessage="No service accounts available to run this workflow."
                />
              )}
            </p>
          )}
        </EuiText>
      )}
      {status === 'ready' && security.serviceAccounts.canCreate() && (
        <div
          css={css({ padding: euiTheme.size.s, borderTop: euiTheme.border.thin, flexShrink: 0 })}
        >
          <EuiButtonEmpty size="s" iconType="plusCircle" onClick={onCreate}>
            <FormattedMessage
              id="workflows.editor.createServiceAccountButtonLabel"
              defaultMessage="Create account"
            />
          </EuiButtonEmpty>
        </div>
      )}
      {status === 'forbidden' && (
        <div css={css({ padding: euiTheme.size.m, borderTop: euiTheme.border.thin })}>
          <EuiLink
            href={docLinks.links.security.clusterPrivileges}
            target="_blank"
            rel="noopener noreferrer"
            external
          >
            <FormattedMessage
              id="workflows.editor.serviceAccountPermissionsDocsLinkText"
              defaultMessage="Learn more about permissions"
            />
          </EuiLink>
        </div>
      )}
    </>
  );
};
