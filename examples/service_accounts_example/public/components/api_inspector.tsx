/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { CREATE_PATH, OPERATION_TYPE } from '../../common/constants';
import type { StatusResponse } from '../../common/types';
import type { CallLogEntry } from '../lib/call_log';
import { classifyError } from '../lib/format_error';

interface Props {
  coreStart: CoreStart;
  status: StatusResponse | null;
  statusError: string | null;
  callLog: CallLogEntry[];
  onLogged: (label: string, fn: () => Promise<unknown>) => Promise<unknown>;
  busy: string | null;
}

const errorCopy = (kind: ReturnType<typeof classifyError>, message: string) => {
  switch (kind) {
    case 'disabled':
      return 'Service accounts are off for this deployment. Enable xpack.security.serviceAccounts.enabled on a serverless project with UIAM.';
    case 'privilege':
      return 'The acting user needs the Elasticsearch manage_security cluster privilege for create, attach, and detach.';
    case 'unbound':
      return 'This job has no service account attached. Open Attach and bind one before running.';
    case 'encryption':
      return 'Workload bindings need saved-object encryption. Set xpack.encryptedSavedObjects.encryptionKey.';
    case 'uiam':
      return 'UIAM or serverless project settings are missing. Service account workloads are UIAM/serverless-only today.';
    default:
      return message;
  }
};

export const ApiInspector = ({
  coreStart,
  status,
  statusError,
  callLog,
  onLogged,
  busy,
}: Props) => {
  const { http, security } = coreStart;
  const [name, setName] = useState('inspector-service-account');
  const latest = callLog[0];
  const latestErrorMessage =
    latest &&
    !latest.ok &&
    typeof latest.payload === 'object' &&
    latest.payload !== null &&
    'error' in latest.payload
      ? String((latest.payload as { error: unknown }).error)
      : '';
  const latestKind = latestErrorMessage ? classifyError(latestErrorMessage) : null;

  const onServerCreate = async () => {
    await onLogged('core.security.serviceAccounts.create (server)', () =>
      http.post(CREATE_PATH, {
        body: JSON.stringify({ name }),
      })
    );
  };

  return (
    <EuiAccordion id="sa-example-inspector" buttonContent="API inspector" paddingSize="m">
      <EuiTitle size="xs">
        <h3>Environment</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {statusError && (
        <EuiCallOut announceOnMount title="Status failed" color="danger" size="s">
          <p>{statusError}</p>
        </EuiCallOut>
      )}
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: 'isEnabled',
            description: String(status?.isEnabled ?? security.serviceAccounts.isEnabled()),
          },
          {
            title: 'canCreate',
            description: String(security.serviceAccounts.canCreate()),
          },
          { title: 'operation type', description: status?.operationType ?? OPERATION_TYPE },
          { title: 'current space', description: status?.spaceId ?? '—' },
        ]}
      />
      {status && !status.isEnabled && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            title="Service accounts are disabled"
            color="warning"
            size="s"
          >
            <p>
              {errorCopy('disabled', '')} This example still loads so you can read the code path.
            </p>
          </EuiCallOut>
        </>
      )}

      <EuiHorizontalRule />
      <EuiTitle size="xs">
        <h3>Server Core create</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          Job attach uses browser Core create. This form dogfoods{' '}
          <EuiCode>core.security.serviceAccounts.create</EuiCode> on the server without mixing it
          into the job flow.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFormRow
        label="Name"
        helpText="Kibana supplies role assignments and assumable_by. Callers only choose a name."
      >
        <EuiFieldText value={name} onChange={(event) => setName(event.target.value)} />
      </EuiFormRow>
      <EuiButton
        onClick={() => void onServerCreate()}
        isLoading={busy === 'core.security.serviceAccounts.create (server)'}
      >
        Create via server Core API
      </EuiButton>

      <EuiHorizontalRule />
      <EuiTitle size="xs">
        <h3>Call log</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {latestKind && latest && (
        <EuiCallOut
          announceOnMount
          title={errorCopy(latestKind, latestErrorMessage)}
          color={latestKind === 'other' ? 'danger' : 'warning'}
          size="s"
        />
      )}
      {callLog.length === 0 && (
        <EuiText size="s" color="subdued">
          <p>No Core or HTTP calls yet.</p>
        </EuiText>
      )}
      {callLog.map((entry) => (
        <EuiText key={`${entry.at}-${entry.label}`} size="s">
          <p>
            <EuiBadge color={entry.ok ? 'success' : 'danger'}>{entry.ok ? 'ok' : 'error'}</EuiBadge>{' '}
            {entry.label} · {entry.durationMs}ms · {entry.at}
          </p>
        </EuiText>
      ))}

      {latest && (
        <>
          <EuiSpacer />
          <EuiAccordion id="sa-example-raw-json" buttonContent="Raw JSON">
            <EuiCodeBlock language="json" isCopyable overflowHeight={360}>
              {JSON.stringify(latest.payload, null, 2)}
            </EuiCodeBlock>
          </EuiAccordion>
        </>
      )}
    </EuiAccordion>
  );
};
