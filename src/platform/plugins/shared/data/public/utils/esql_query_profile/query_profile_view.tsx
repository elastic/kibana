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
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpStart } from '@kbn/core/public';
import type { Adapters, Request } from '@kbn/inspector-plugin/public';
import type { ISearchStart } from '../../search';
import type { QueryProfileView as QueryProfileViewModel } from './query_profile_model';
import { ByCommandTab, hasCommandBreakdown } from './by_command_tab';
import { esqlRequestLabels } from './esql_request_label';
import { listEsqlInspectorRequests } from './esql_inspector_requests';
import { FasterQuerySuggestion } from './faster_query_suggestion';
import { loadEsqlQueryProfile } from './load_esql_query_profile';
import { ProfileSummary } from './profile_summary';
import { readRequestQuery } from './json_helpers';
import { readErrorMessage } from './read_error_message';
import { TimelineTab } from './timeline_tab';

type TabId = 'timeline' | 'byCommand';

/** The query of a logged request, or nothing when it has none or an empty one. */
const readQuery = (request: Request | undefined): string | undefined =>
  readRequestQuery(request?.json) || undefined;

const completedRequestTime = (request: Request | undefined): string | undefined => {
  const value = request?.stats?.queryTime?.value;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const useEsqlRequests = (adapters: Adapters): Request[] => {
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
};

const useQueryProfile = (
  search: Pick<ISearchStart, 'esql'>,
  request: Request | undefined,
  reloadKey: number
): { view?: QueryProfileViewModel; error?: string; loading: boolean } => {
  const [view, setView] = useState<QueryProfileViewModel | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(request?.json));
  const requestJson = request?.json;
  const requestId = request?.id;

  useEffect(() => {
    setView(undefined);
    setError(undefined);
    if (!requestJson) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

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
          readErrorMessage(
            caught,
            i18n.translate('data.inspector.queryProfile.unknownErrorMessage', {
              defaultMessage: 'The query profile failed.',
            })
          )
        );
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [requestId, requestJson, search, reloadKey]);

  return { view, error, loading };
};

const RequestPicker = ({
  requests,
  selected,
  onSelect,
}: {
  requests: Request[];
  selected: Request;
  onSelect: (request: Request) => void;
}) => {
  const requestLabel = i18n.translate('data.inspector.queryProfile.requestLabel', {
    defaultMessage: 'Request',
  });
  const labels = esqlRequestLabels(requests);
  const options = requests.map((request) => ({
    label: labels.get(request.id) ?? request.name,
    value: request.id,
  }));

  return (
    <EuiComboBox
      aria-label={requestLabel}
      data-test-subj="esqlQueryProfileRequest"
      fullWidth
      isClearable={false}
      options={options}
      prepend={requestLabel}
      selectedOptions={[{ label: labels.get(selected.id) ?? selected.name, value: selected.id }]}
      singleSelection={{ asPlainText: true }}
      onChange={(selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
        const next = requests.find((request) => request.id === selectedOptions[0]?.value);
        if (next) {
          onSelect(next);
        }
      }}
    />
  );
};

const ProfileLoading = () => (
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
);

/** The timeline and by-command tabs, or a note when the profile has nothing to show in them. */
const ProfileDetails = ({
  view,
  query,
  activeTab,
  showByCommand,
  requestId,
  onTabChange,
}: {
  view: QueryProfileViewModel;
  query?: string;
  activeTab: TabId;
  showByCommand: boolean;
  requestId?: string;
  onTabChange: (tab: TabId) => void;
}) => {
  if (!view.hasTimeline && !showByCommand) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="data.inspector.queryProfile.noTimelineDescription"
              defaultMessage="This profile did not include timing for individual drivers."
            />
          </p>
        </EuiText>
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTabs size="s" bottomBorder>
        <EuiTab
          isSelected={activeTab === 'timeline'}
          onClick={() => onTabChange('timeline')}
          data-test-subj="esqlQueryProfileTimelineTab"
        >
          {i18n.translate('data.inspector.queryProfile.timelineTabLabel', {
            defaultMessage: 'Timeline',
          })}
        </EuiTab>
        {showByCommand ? (
          <EuiTab
            isSelected={activeTab === 'byCommand'}
            onClick={() => onTabChange('byCommand')}
            data-test-subj="esqlQueryProfileByCommandTab"
          >
            {i18n.translate('data.inspector.queryProfile.byCommandTabLabel', {
              defaultMessage: 'By command',
            })}
          </EuiTab>
        ) : null}
      </EuiTabs>
      <EuiSpacer size="m" />
      {activeTab === 'byCommand' && query ? (
        <ByCommandTab view={view} query={query} />
      ) : view.hasTimeline ? (
        <TimelineTab key={requestId} view={view} />
      ) : null}
    </>
  );
};

/** Re-runs a logged ES|QL request with profiling and shows where the time went. */
export const QueryProfileView = ({
  adapters,
  search,
  http,
}: {
  adapters: Adapters;
  search: Pick<ISearchStart, 'esql'>;
  /** Needed for the AI suggestion. Without it the suggestion is not offered. */
  http?: Pick<HttpStart, 'get' | 'post'>;
}) => {
  const requests = useEsqlRequests(adapters);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0],
    [requests, selectedId]
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<TabId>('timeline');
  const { view, error, loading } = useQueryProfile(search, selected, reloadKey);
  const completedTime = completedRequestTime(selected);
  const query = readQuery(selected);
  const showByCommand = Boolean(view && hasCommandBreakdown(view, query));
  const activeTab = tab === 'byCommand' && !showByCommand ? 'timeline' : tab;

  return (
    <div data-test-subj="esqlQueryProfile">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            isDisabled={loading}
            onClick={() => setReloadKey((key) => key + 1)}
            data-test-subj="esqlQueryProfileRunAgain"
          >
            <FormattedMessage
              id="data.inspector.queryProfile.profileAgainButtonLabel"
              defaultMessage="Profile again"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
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
      <EuiSpacer size="m" />
      {error ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('data.inspector.queryProfile.profileFailedTitle', {
            defaultMessage: 'Unable to profile this query',
          })}
          text={<p>{error}</p>}
        />
      ) : loading || !view ? (
        <ProfileLoading />
      ) : (
        <>
          <ProfileSummary view={view} />
          {http && selected?.json && query ? (
            <>
              <EuiSpacer size="m" />
              <FasterQuerySuggestion
                http={http}
                search={search}
                requestJson={selected.json}
                originalQuery={query}
                originalView={view}
              />
            </>
          ) : null}
          <ProfileDetails
            view={view}
            query={query}
            activeTab={activeTab}
            showByCommand={showByCommand}
            requestId={selected?.id}
            onTabChange={setTab}
          />
        </>
      )}
    </div>
  );
};
