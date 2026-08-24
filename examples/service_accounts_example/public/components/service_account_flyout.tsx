/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { SECURITY_SERVICE_ACCOUNT_PATH } from '../../common/constants';
import type { RetrievedServiceAccount } from '../../common/types';
import { formatError } from '../lib/format_error';
import { ServiceAccountCard } from './service_account_card';

export const ServiceAccountIdLink = ({
  id,
  onClick,
}: {
  id: string;
  onClick: (id: string) => void;
}) => (
  <EuiLink
    onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(id);
    }}
  >
    {id}
  </EuiLink>
);

export const ServiceAccountFlyout = ({
  http,
  serviceAccountId,
  onClose,
}: {
  http: HttpStart;
  serviceAccountId: string;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId();
  const [account, setAccount] = useState<RetrievedServiceAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAccount(null);

    void (async () => {
      try {
        const result = await http.get<RetrievedServiceAccount>(
          `${SECURITY_SERVICE_ACCOUNT_PATH}/${encodeURIComponent(serviceAccountId)}`
        );
        if (!cancelled) {
          setAccount(result);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(formatError(caught));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [http, serviceAccountId]);

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{account?.name ?? 'Service account'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading && <EuiLoadingSpinner size="l" />}
        {error && (
          <EuiCallOut announceOnMount title="Could not get service account" color="danger" size="s">
            <p>{error}</p>
          </EuiCallOut>
        )}
        {account && <ServiceAccountCard account={account} />}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
