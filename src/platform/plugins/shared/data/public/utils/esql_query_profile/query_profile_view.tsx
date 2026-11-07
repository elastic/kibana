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
  EuiButtonIcon,
  EuiComboBox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpStart } from '@kbn/core/public';
import type { Adapters, Request } from '@kbn/inspector-plugin/public';
import type { ISearchStart } from '../../search';
import { esqlRequestLabels } from './esql_request_label';
import { listEsqlInspectorRequests } from './is_esql_inspector_request';
import { loadEsqlQueryProfile } from './load_esql_query_profile';
import type { QueryProfileView as QueryProfileViewModel } from './aggregate_esql_profile';
import { FasterQuerySuggestion } from './faster_query_suggestion';
import { isSameQuery } from './query_commands';
import { ProfileComparisonPanel } from './profile_comparison';
import { getProfileBaseline, setProfileBaseline } from './profile_baseline';
import type { ProfileBaseline } from './profile_baseline';
import { QueryProfileBody } from './query_profile_body';

export function QueryProfileView({
  adapters,
  search,
  http,
  options,
}: {
  adapters: Adapters;
  search: Pick<ISearchStart, 'esql'>;
  /** Needed for the AI suggestion. Without it the suggestion is not offered. */
  http?: Pick<HttpStart, 'get' | 'post'>;
  title?: string;
  options?: unknown;
}) {
  const requests = useEsqlRequests(adapters);
  const [selectedId, setSelectedId] = useState<string | undefined>(readInitialRequestId(options));
  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0],
    [requests, selectedId]
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [baseline, setBaseline] = useState<ProfileBaseline | undefined>(getProfileBaseline);
  const { view, error, loading } = useQueryProfile(search, selected, reloadKey);
  const completedTime = completedRequestTime(selected);
  const selectedQuery = readQuery(selected);
  // A request can be a different query than the one in the editor, such as the one behind a
  // visualization. Nothing can be done with a faster version of it, and it cannot be shown on the
  // editor or replace the editor's query, so those actions are only offered for the editor's query.
  const editorQuery = readEditorQuery(options);
  const isEditorQuery =
    selectedQuery !== undefined &&
    editorQuery !== undefined &&
    isSameQuery(selectedQuery, editorQuery);
  const isOtherQuery = selectedQuery !== undefined && editorQuery !== undefined && !isEditorQuery;

  const updateBaseline = (next: ProfileBaseline | undefined) => {
    setProfileBaseline(next);
    setBaseline(next);
  };

  return (
    <div data-test-subj="esqlQueryProfile">
      <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileIntro">
        <p>
          {completedTime
            ? i18n.translate('data.inspector.queryProfile.introWithTimeDescription', {
                defaultMessage:
                  'Profiled re-run of the request. The original took {time} and is unchanged.',
                values: { time: completedTime },
              })
            : i18n.translate('data.inspector.queryProfile.introDescription', {
                defaultMessage:
                  'Profiled re-run of the selected request. The original is unchanged.',
              })}
        </p>
      </EuiText>
      {requests.length > 1 && selected ? (
        <>
          <EuiSpacer size="s" />
          <RequestPicker
            requests={requests}
            selected={selected}
            onSelect={(request) => setSelectedId(request.id)}
          />
        </>
      ) : null}
      {isOtherQuery ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileOtherQuery">
            <FormattedMessage
              id="data.inspector.queryProfile.otherQueryDescription"
              defaultMessage="This is not the query in the editor, for example it is the query behind a visualization. It can be profiled, but not changed or shown on the editor."
            />
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="s" />
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
        <>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem>
              {http && selected?.json && selectedQuery && !isOtherQuery ? (
                <FasterQuerySuggestion
                  http={http}
                  search={search}
                  requestJson={selected.json}
                  originalQuery={selectedQuery}
                  originalView={view}
                  onApplyQuery={isEditorQuery ? readOnApplyQuery(options) : undefined}
                />
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ProfileActionsMenu
                onProfileAgain={() => setReloadKey((key) => key + 1)}
                onUseAsBaseline={
                  selectedQuery && baseline?.view !== view
                    ? () => updateBaseline({ view, query: selectedQuery })
                    : undefined
                }
                onClearBaseline={baseline ? () => updateBaseline(undefined) : undefined}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {baseline?.view === view ? (
            <>
              <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileIsBaseline">
                <FormattedMessage
                  id="data.inspector.queryProfile.isBaselineDescription"
                  defaultMessage="This run is the baseline. Change the query and profile it again, or pick another request, to compare."
                />
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : baseline ? (
            <ProfileComparisonPanel
              baseline={baseline}
              current={view}
              currentQuery={selectedQuery}
            />
          ) : null}
          <QueryProfileBody
            key={selected?.id}
            view={view}
            query={selectedQuery}
            canShowOnQuery={isEditorQuery}
          />
        </>
      )}
    </div>
  );
}

function ProfileActionsMenu({
  onProfileAgain,
  onUseAsBaseline,
  onClearBaseline,
}: {
  onProfileAgain: () => void;
  onUseAsBaseline?: () => void;
  onClearBaseline?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const run = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  const items = [
    <EuiContextMenuItem
      key="again"
      icon="refresh"
      onClick={run(onProfileAgain)}
      data-test-subj="esqlQueryProfileRunAgain"
    >
      {i18n.translate('data.inspector.queryProfile.profileAgainButtonLabel', {
        defaultMessage: 'Profile again',
      })}
    </EuiContextMenuItem>,
    ...(onUseAsBaseline
      ? [
          <EuiContextMenuItem
            key="baseline"
            icon="pin"
            onClick={run(onUseAsBaseline)}
            data-test-subj="esqlQueryProfileSetBaseline"
          >
            {i18n.translate('data.inspector.queryProfile.setBaselineButtonLabel', {
              defaultMessage: 'Use as baseline',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(onClearBaseline
      ? [
          <EuiContextMenuItem
            key="clear"
            icon="cross"
            onClick={run(onClearBaseline)}
            data-test-subj="esqlQueryProfileClearBaseline"
          >
            {i18n.translate('data.inspector.queryProfile.clearBaselineButtonLabel', {
              defaultMessage: 'Clear baseline',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  const moreActionsLabel = i18n.translate('data.inspector.queryProfile.moreActionsAriaLabel', {
    defaultMessage: 'More actions',
  });

  return (
    <EuiPopover
      aria-label={moreActionsLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiToolTip content={moreActionsLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            size="s"
            color="text"
            aria-label={moreActionsLabel}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj="esqlQueryProfileActions"
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
}

function readInitialRequestId(options: unknown): string | undefined {
  if (!options || typeof options !== 'object' || !('initialRequestId' in options)) {
    return undefined;
  }
  const requestId = (options as { initialRequestId?: unknown }).initialRequestId;
  return typeof requestId === 'string' && requestId.length > 0 ? requestId : undefined;
}

/** The opener can say which query its editor holds. */
function readEditorQuery(options: unknown): string | undefined {
  if (!options || typeof options !== 'object' || !('editorQuery' in options)) {
    return undefined;
  }
  const { editorQuery } = options as { editorQuery?: unknown };
  return typeof editorQuery === 'string' ? editorQuery : undefined;
}

/** The opener can pass a function that puts a query in its editor. */
function readOnApplyQuery(options: unknown): ((query: string) => void) | undefined {
  if (!options || typeof options !== 'object' || !('onApplyQuery' in options)) {
    return undefined;
  }
  const { onApplyQuery } = options as { onApplyQuery?: unknown };
  return typeof onApplyQuery === 'function' ? (onApplyQuery as (query: string) => void) : undefined;
}

function readQuery(request: Request | undefined): string | undefined {
  const json: unknown = request?.json;
  if (!json || typeof json !== 'object' || !('query' in json)) {
    return undefined;
  }
  const { query } = json as { query?: unknown };
  return typeof query === 'string' && query.length > 0 ? query : undefined;
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
  request: Request | undefined,
  reloadKey: number
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
  }, [requestId, requestJson, search, reloadKey]);

  return { view, error, loading };
}
