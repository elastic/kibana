/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Adapters, Request } from '@kbn/inspector-plugin/public';
import type { ISearchStart } from '../../search';
import { esqlRequestLabels } from './esql_request_label';
import { listEsqlInspectorRequests } from './is_esql_inspector_request';
import { loadEsqlQueryProfile } from './load_esql_query_profile';
import type { QueryProfileView as QueryProfileViewModel } from './aggregate_esql_profile';
import { QueryProfileBody } from './query_profile_body';

export function QueryProfileView({
  adapters,
  search,
  options,
}: {
  adapters: Adapters;
  search: Pick<ISearchStart, 'esql'>;
  title?: string;
  options?: unknown;
}) {
  const requests = useEsqlRequests(adapters);
  const [selectedId, setSelectedId] = useState<string | undefined>(readInitialRequestId(options));
  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0],
    [requests, selectedId]
  );
  const { view, error, loading } = useQueryProfile(search, selected);
  const completedTime = completedRequestTime(selected);

  return (
    <div data-test-subj="esqlQueryProfile">
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.rerunDescription"
            defaultMessage="Re-runs the selected request with profiling. The request that already completed is unchanged."
          />
        </p>
      </EuiText>
      {requests.length > 1 && selected ? (
        <>
          <EuiSpacer size="m" />
          <RequestPicker
            requests={requests}
            selected={selected}
            onSelect={(request) => setSelectedId(request.id)}
          />
        </>
      ) : null}
      {completedTime ? (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" data-test-subj="esqlQueryProfileCompletedRequest">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.completedRequestDescription"
                defaultMessage="Completed request: {time}"
                values={{ time: completedTime }}
              />
            </p>
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="m" />
      {error ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('data.inspector.queryProfile.profileFailedTitle', {
            defaultMessage: 'Unable to profile this query',
          })}
        >
          <p>{error}</p>
        </KbnDangerCallout>
      ) : loading || !view ? (
        <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="esqlQueryProfileLoading">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <FormattedMessage
                id="data.inspector.queryProfile.loadingDescription"
                defaultMessage="Running the query with profiling."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <QueryProfileBody key={selected?.id} view={view} />
      )}
    </div>
  );
}

function readInitialRequestId(options: unknown): string | undefined {
  if (!options || typeof options !== 'object' || !('initialRequestId' in options)) {
    return undefined;
  }
  const requestId = (options as { initialRequestId?: unknown }).initialRequestId;
  return typeof requestId === 'string' && requestId.length > 0 ? requestId : undefined;
}

function completedRequestTime(request: Request | undefined): string | undefined {
  const value = request?.stats?.queryTime?.value;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function RequestPicker({
  requests,
  selected,
  onSelect,
}: {
  requests: Request[];
  selected: Request;
  onSelect: (request: Request) => void;
}) {
  const requestLabel = i18n.translate('data.inspector.queryProfile.requestLabel', {
    defaultMessage: 'Request',
  });
  const labels = esqlRequestLabels(requests);
  const options = requests.map((request) => ({
    label: labels.get(request.id) ?? request.name,
    value: request.id,
  }));
  const selectedLabel = labels.get(selected.id) ?? selected.name;

  return (
    <EuiComboBox
      aria-label={requestLabel}
      data-test-subj="esqlQueryProfileRequest"
      fullWidth
      isClearable={false}
      options={options}
      prepend={requestLabel}
      selectedOptions={[{ label: selectedLabel, value: selected.id }]}
      singleSelection={{ asPlainText: true }}
      onChange={(selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
        const next = requests.find((request) => request.id === selectedOptions[0]?.value);
        if (next) {
          onSelect(next);
        }
      }}
    />
  );
}

function useEsqlRequests(adapters: Adapters): Request[] {
  const [requests, setRequests] = useState(() => listEsqlInspectorRequests(adapters));

  useEffect(() => {
    const adapter = adapters.requests;
    if (!adapter) {
      setRequests([]);
      return;
    }

    const refresh = () => setRequests(listEsqlInspectorRequests(adapters));
    refresh();
    adapter.on('change', refresh);
    return () => {
      adapter.off('change', refresh);
    };
  }, [adapters]);

  return requests;
}

function useQueryProfile(
  search: Pick<ISearchStart, 'esql'>,
  request: Request | undefined
): { view?: QueryProfileViewModel; error?: string; loading: boolean } {
  const [view, setView] = useState<QueryProfileViewModel | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(request?.json));
  const requestJson = request?.json;
  const requestId = request?.id;

  useEffect(() => {
    if (!requestJson) {
      setView(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setView(undefined);

    loadEsqlQueryProfile({ search, requestJson, abortSignal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) {
          setView(next);
          setLoading(false);
        }
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : i18n.translate('data.inspector.queryProfile.unknownErrorMessage', {
                defaultMessage: 'The query profile failed.',
              })
        );
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [requestId, requestJson, search]);

  return { view, error, loading };
}
