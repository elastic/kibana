/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { SECURITY_SERVICE_ACCOUNT_PATH } from '../../common/constants';
import type { ListServiceAccountsResponse, RetrievedServiceAccount } from '../../common/types';
import { formatError, getErrorStatus } from '../lib/format_error';
import { ServiceAccountCard, type DirectoryAccount } from './service_account_card';

interface Props {
  coreStart: CoreStart;
  onLogged: (label: string, fn: () => Promise<unknown>) => Promise<unknown>;
  busy: string | null;
}

const toDirectoryAccount = (
  account: RetrievedServiceAccount | DirectoryAccount
): DirectoryAccount => account;

export const AccountsDirectory = ({ coreStart, onLogged, busy }: Props) => {
  const { http, security } = coreStart;
  const [accounts, setAccounts] = useState<DirectoryAccount[]>([]);
  const [lookedUpId, setLookedUpId] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [name, setName] = useState('example-service-account');

  const upsertAccount = (account: DirectoryAccount) => {
    setAccounts((current) => {
      const without = current.filter((item) => item.id !== account.id);
      return [account, ...without];
    });
  };

  const loadAccounts = useCallback(async () => {
    setListError(null);
    setUnsupported(null);
    try {
      // TODO: real consumers should not call internal API routes.
      // A suitable public API/contract does not yet exist.
      const result = await http.get<ListServiceAccountsResponse>(SECURITY_SERVICE_ACCOUNT_PATH);
      setAccounts(result.service_accounts.map(toDirectoryAccount));
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 404 || status === 501) {
        setUnsupported(
          status === 501
            ? 'UIAM does not support listing service accounts yet (HTTP 501). Look up an account by id below.'
            : 'The service-account directory is not available (HTTP 404). Look up an account by id below.'
        );
        return;
      }
      setListError(formatError(error));
    }
  }, [http]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const onCreate = async () => {
    await onLogged('core.security.serviceAccounts.create (browser)', async () => {
      const created = await security.serviceAccounts.create({ name });
      upsertAccount(toDirectoryAccount(created));
      await loadAccounts();
      return created;
    });
  };

  const onLookup = async () => {
    const id = lookupId.trim();
    if (!id) {
      setLookupError('Enter a service account id');
      return;
    }
    setLookupError(null);
    await onLogged(`GET ${SECURITY_SERVICE_ACCOUNT_PATH}/{id}`, async () => {
      try {
        const account = await http.get<RetrievedServiceAccount>(
          `${SECURITY_SERVICE_ACCOUNT_PATH}/${encodeURIComponent(id)}`
        );
        upsertAccount(account);
        setLookedUpId(account.id);
        return account;
      } catch (error) {
        setLookupError(formatError(error));
        throw error;
      }
    });
  };

  const featured = lookedUpId ? accounts.find((account) => account.id === lookedUpId) : undefined;
  const rest = featured ? accounts.filter((account) => account.id !== featured.id) : accounts;

  return (
    <EuiPanel paddingSize="m">
      <EuiTitle size="s">
        <h2>Accounts</h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      {unsupported && (
        <EuiCallOut announceOnMount title="Listing is not supported" color="warning" size="s">
          <p>{unsupported}</p>
        </EuiCallOut>
      )}
      {listError && (
        <EuiCallOut announceOnMount title="Could not list service accounts" color="danger" size="s">
          <p>{listError}</p>
        </EuiCallOut>
      )}

      <EuiSpacer size="m" />
      <EuiForm>
        <EuiFormRow
          label="Look up by id"
          helpText="Fetches the full UIAM record, including creator. Works when listing is unavailable."
        >
          <EuiFieldText
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value)}
            placeholder="service-account-id"
          />
        </EuiFormRow>
        {lookupError && (
          <EuiCallOut announceOnMount title="Could not get service account" color="danger" size="s">
            <p>{lookupError}</p>
          </EuiCallOut>
        )}
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => void onLookup()}
              isLoading={busy === `GET ${SECURITY_SERVICE_ACCOUNT_PATH}/{id}`}
              isDisabled={busy !== null}
            >
              Get by id
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>

      {featured && (
        <>
          <EuiSpacer />
          <ServiceAccountCard account={featured} badge="Retrieved" />
        </>
      )}

      {rest.length > 0 && (
        <>
          <EuiSpacer />
          <EuiTitle size="xs">
            <h3>{featured ? 'Other accounts in the directory' : 'Directory'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="s">
            {rest.map((account) => (
              <EuiFlexItem key={account.id} grow={false}>
                <ServiceAccountCard account={account} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      {accounts.length === 0 && !unsupported && !listError && (
        <>
          <EuiSpacer />
          <EuiText size="s" color="subdued">
            <p>No service accounts yet. Look up an id, or create one below.</p>
          </EuiText>
        </>
      )}

      <EuiSpacer />
      <EuiForm>
        <EuiFormRow
          label="Name"
          helpText="Kibana supplies role assignments and assumable_by. Callers only choose a name."
        >
          <EuiFieldText value={name} onChange={(event) => setName(event.target.value)} />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => void onCreate()}
              isLoading={busy === 'core.security.serviceAccounts.create (browser)'}
              isDisabled={!security.serviceAccounts.canCreate()}
            >
              Create service account
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => void loadAccounts()} isDisabled={busy !== null}>
              Refresh directory
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </EuiPanel>
  );
};
