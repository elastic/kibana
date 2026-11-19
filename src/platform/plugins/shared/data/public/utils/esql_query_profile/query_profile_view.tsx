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
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { getConnectorsUrl, readRequestErrorMessage } from '@kbn/esql-utils';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { Adapters, Request } from '@kbn/inspector-plugin/public';
import type { ISearchStart } from '../../search';
import type { QueryProfileView as QueryProfileViewModel } from './profile/types';
import { ByCommandTab, computeCommandHeat, hasCommandBreakdown } from './by_command/by_command_tab';
import type { QueryHeat } from './by_command/map_operators_to_commands';
import { listEsqlInspectorRequests } from './esql_inspector_requests';
import { FasterQuerySuggestion } from './suggestion/faster_query_suggestion';
import { loadEsqlQueryProfile } from './profile/load_esql_query_profile';
import { ProfileSummary } from './profile_summary';
import { readRequestQuery } from './shared/json_helpers';
import { useHasEnterpriseLicense } from './suggestion/use_has_enterprise_license';
import { TimelineTab } from './timeline/timeline_tab';

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

/** A loaded profile, or the reason it failed, with the request and run it belongs to. */
interface LoadedProfile {
  requestJson: object;
  reloadKey: number;
  view?: QueryProfileViewModel;
  error?: string;
}

const useQueryProfile = (
  search: Pick<ISearchStart, 'esql'>,
  request: Request | undefined,
  reloadKey: number
): { view?: QueryProfileViewModel; error?: string; loading: boolean } => {
  const [loaded, setLoaded] = useState<LoadedProfile | undefined>();
  const requestJson = request?.json;

  useEffect(() => {
    if (!requestJson) {
      return;
    }

    const controller = new AbortController();
    loadEsqlQueryProfile({ search, requestJson, abortSignal: controller.signal })
      .then((view) => {
        if (!controller.signal.aborted) {
          setLoaded({ requestJson, reloadKey, view });
        }
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoaded({
          requestJson,
          reloadKey,
          error: readRequestErrorMessage(
            caught,
            i18n.translate('data.inspector.queryProfile.unknownErrorMessage', {
              defaultMessage: 'The query profile failed.',
            })
          ),
        });
      });

    return () => {
      controller.abort();
    };
  }, [requestJson, search, reloadKey]);

  // What was loaded for another request or run is not shown, not even for a moment.
  const current =
    loaded?.requestJson === requestJson && loaded?.reloadKey === reloadKey ? loaded : undefined;
  return { view: current?.view, error: current?.error, loading: Boolean(requestJson) && !current };
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
  const options = requests.map((request) => ({ label: request.name, value: request.id }));

  return (
    <EuiComboBox
      aria-label={requestLabel}
      data-test-subj="esqlQueryProfileRequest"
      fullWidth
      isClearable={false}
      options={options}
      prepend={requestLabel}
      selectedOptions={[{ label: selected.name, value: selected.id }]}
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
  heat,
  activeTab,
  showByCommand,
  requestId,
  onTabChange,
}: {
  view: QueryProfileViewModel;
  heat?: QueryHeat;
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
      {activeTab === 'byCommand' && heat ? (
        <ByCommandTab heat={heat} />
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
  licensing,
  application,
}: {
  adapters: Adapters;
  search: Pick<ISearchStart, 'esql'>;
  /** Needed for the AI suggestion. Without it the suggestion is not offered. */
  http?: Pick<HttpStart, 'post'>;
  /** Needed to know whether the license allows the AI suggestion. */
  licensing?: LicensingPluginStart;
  /** Needed to link to the place where an AI connector is set up. */
  application?: Pick<ApplicationStart, 'capabilities' | 'getUrlForApp'>;
}) => {
  const hasEnterpriseLicense = useHasEnterpriseLicense(licensing);
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
  const heat = useMemo(
    () => (view && query ? computeCommandHeat(view, query) : undefined),
    [view, query]
  );
  const showByCommand = hasCommandBreakdown(heat);
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
      ) : !selected?.json ? (
        <EuiText size="s" color="subdued" data-test-subj="esqlQueryProfileNoRequest">
          <p>
            <FormattedMessage
              id="data.inspector.queryProfile.noRequestDescription"
              defaultMessage="There is no ES|QL request to profile."
            />
          </p>
        </EuiText>
      ) : loading || !view ? (
        <ProfileLoading />
      ) : (
        <>
          <ProfileSummary view={view} />
          {http && hasEnterpriseLicense && selected?.json && query ? (
            <>
              <EuiSpacer size="m" />
              <FasterQuerySuggestion
                http={http}
                search={search}
                requestJson={selected.json}
                originalQuery={query}
                originalView={view}
                connectorsUrl={application ? getConnectorsUrl(application) : undefined}
              />
            </>
          ) : null}
          <ProfileDetails
            view={view}
            heat={heat}
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
