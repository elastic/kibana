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
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { SECURITY_SERVICE_ACCOUNT_PATH } from '../../common/constants';
import type { ListServiceAccountsResponse } from '../../common/types';
import { formatError, getErrorStatus } from '../lib/format_error';

type Mode = 'create' | 'pick' | 'paste';

interface DirectoryAccount {
  id: string;
  name: string;
}

interface Props {
  coreStart: CoreStart;
  onClose: () => void;
  onAttach: (serviceAccountId: string) => Promise<void>;
  onCreateAndAttach: (params: { name: string }) => Promise<void>;
  busy: boolean;
}

export const AttachFlyout = ({ coreStart, onClose, onAttach, onCreateAndAttach, busy }: Props) => {
  const titleId = useGeneratedHtmlId();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('example-service-account');
  const [pastedId, setPastedId] = useState('');
  const [pickedId, setPickedId] = useState<string | undefined>();
  const [accounts, setAccounts] = useState<DirectoryAccount[]>([]);
  const [listUnsupported, setListUnsupported] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setListError(null);
    setListUnsupported(null);
    try {
      // TODO: real consumers should not call internal API routes.
      // A suitable public API/contract does not yet exist.
      const result = await coreStart.http.get<ListServiceAccountsResponse>(
        SECURITY_SERVICE_ACCOUNT_PATH
      );
      setAccounts(result.service_accounts);
      setPickedId((current) => current ?? result.service_accounts[0]?.id);
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 404 || status === 501) {
        setListUnsupported('The directory is not available. Paste a service account id instead.');
        return;
      }
      setListError(formatError(error));
    }
  }, [coreStart.http]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const submit = async () => {
    if (mode === 'create') {
      await onCreateAndAttach({ name });
      return;
    }
    if (mode === 'pick' && pickedId) {
      await onAttach(pickedId);
      return;
    }
    if (mode === 'paste' && pastedId.trim()) {
      await onAttach(pastedId.trim());
    }
  };

  return (
    <EuiFlyout onClose={onClose} size="s" ownFocus aria-labelledby={titleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>Attach a service account</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiRadioGroup
          name="sa-example-attach-mode"
          idSelected={mode}
          onChange={(id) => setMode(id as Mode)}
          options={[
            { id: 'create', label: 'Create and attach (browser Core create)' },
            { id: 'pick', label: 'Pick from directory' },
            { id: 'paste', label: 'Paste an id' },
          ]}
        />
        <EuiSpacer />

        {mode === 'create' && (
          <EuiForm>
            <EuiFormRow label="Name">
              <EuiFieldText value={name} onChange={(event) => setName(event.target.value)} />
            </EuiFormRow>
          </EuiForm>
        )}

        {mode === 'pick' && (
          <>
            {listUnsupported && (
              <EuiCallOut announceOnMount color="warning" size="s" title="Directory unavailable">
                <p>{listUnsupported}</p>
              </EuiCallOut>
            )}
            {listError && (
              <EuiCallOut announceOnMount color="danger" size="s" title="Could not load accounts">
                <p>{listError}</p>
              </EuiCallOut>
            )}
            {accounts.length > 0 && (
              <EuiRadioGroup
                name="sa-example-attach-account"
                idSelected={pickedId}
                onChange={(id) => setPickedId(id)}
                options={accounts.map((account) => ({
                  id: account.id,
                  label: `${account.name} (${account.id})`,
                }))}
              />
            )}
            {accounts.length === 0 && !listUnsupported && !listError && (
              <EuiCallOut
                announceOnMount
                color="primary"
                size="s"
                title="No accounts in the directory"
              >
                Create one first, or paste an id.
              </EuiCallOut>
            )}
          </>
        )}

        {mode === 'paste' && (
          <EuiFormRow label="Service account id">
            <EuiFieldText value={pastedId} onChange={(event) => setPastedId(event.target.value)} />
          </EuiFormRow>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={() => void submit()} isLoading={busy}>
              Attach
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
