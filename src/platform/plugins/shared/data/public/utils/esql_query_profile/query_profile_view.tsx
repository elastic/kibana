/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
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
import type { QueryProfileView as QueryProfileViewModel } from './profile/types';
import { listEsqlInspectorRequests } from './esql_inspector_requests';
import { loadEsqlQueryProfile } from './profile/load_esql_query_profile';
import { ProfileSummary } from './profile_summary';
import { TimelineTab } from './timeline/timeline_tab';

/** The message of a caught error, or the fallback when it has none. */
const readErrorMessage = (caught: unknown, fallback: string): string =>
  caught instanceof Error && caught.message ? caught.message : fallback;

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

/** A loaded profile, or the reason it failed, with the run it belongs to and the request it profiled. */
interface LoadedProfile {
  runKey: string;
  request: Request;
  view?: QueryProfileViewModel;
  error?: string;
}

/**
 * Profiles the request when a run is asked for: when the view opens, when another request is picked
 * and when the user profiles again, all of which change `runKey`. The panel being inspected can
 * fetch again by itself, as with auto-refresh, and that logs a new request. It must not send
 * another profiled run to the cluster, nor replace the profile that is being read.
 */
const useQueryProfile = (
  search: Pick<ISearchStart, 'esql'>,
  request: Request | undefined,
  runKey: string
): {
  view?: QueryProfileViewModel;
  error?: string;
  /** The request that the profile on show was taken for. */
  profiledRequest?: Request;
  loading: boolean;
} => {
  const [loaded, setLoaded] = useState<LoadedProfile | undefined>();
  const latestRequest = useRef(request);
  latestRequest.current = request;
  // Once a request was logged this stays true. A refetch of the inspected panel empties the adapter
  // for a moment, and that must not cancel the run that is going on, nor start another one.
  const [hasSeenRequest, setHasSeenRequest] = useState(Boolean(request?.json));
  const hasRequest = Boolean(request?.json);
  useEffect(() => {
    if (hasRequest) {
      setHasSeenRequest(true);
    }
  }, [hasRequest]);

  useEffect(() => {
    const target = latestRequest.current;
    const requestJson = target?.json;
    if (!hasSeenRequest || !target || !requestJson) {
      return;
    }

    const controller = new AbortController();
    loadEsqlQueryProfile({ search, requestJson, abortSignal: controller.signal })
      .then((view) => {
        if (!controller.signal.aborted) {
          setLoaded({ runKey, request: target, view });
        }
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoaded({
          runKey,
          request: target,
          error: readErrorMessage(
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
  }, [hasSeenRequest, runKey, search]);

  // What was loaded for another run is not shown, not even for a moment.
  const current = loaded?.runKey === runKey ? loaded : undefined;
  return {
    view: current?.view,
    error: current?.error,
    profiledRequest: current?.request,
    loading: hasSeenRequest && loaded?.runKey !== runKey,
  };
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

/** The timeline, or a note when the profile has no timing for its drivers. */
const ProfileDetails = ({
  view,
  requestId,
}: {
  view: QueryProfileViewModel;
  requestId?: string;
}) => (
  <>
    <EuiSpacer size="m" />
    {view.hasTimeline ? (
      <TimelineTab key={requestId} view={view} />
    ) : (
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.noTimelineDescription"
            defaultMessage="This profile did not include timing for individual drivers."
          />
        </p>
      </EuiText>
    )}
  </>
);

/** Re-runs a logged ES|QL request with profiling and shows where the time went. */
export const QueryProfileView = ({
  adapters,
  search,
}: {
  adapters: Adapters;
  search: Pick<ISearchStart, 'esql'>;
}) => {
  const requests = useEsqlRequests(adapters);
  // A refetch logs the requests again with new ids but the same names, so the pick is kept by both.
  const [picked, setPicked] = useState<{ id: string; name: string } | undefined>();
  const selected = useMemo(
    () =>
      requests.find((request) => request.id === picked?.id) ??
      requests.find((request) => request.name === picked?.name) ??
      requests[0],
    [requests, picked]
  );
  const [reloadKey, setReloadKey] = useState(0);
  const { view, error, profiledRequest, loading } = useQueryProfile(
    search,
    selected,
    `${picked?.id ?? ''}:${reloadKey}`
  );
  // The request that was profiled can still be pending when the profile starts, so its time is read
  // from the latest copy of it while it is logged, and from the one taken once it is not.
  const completedTime = completedRequestTime(
    requests.find((request) => request.json === profiledRequest?.json) ?? profiledRequest
  );
  // The inspected panel fetched again since the profile was taken, or its request is gone.
  const hasRequestChanged = Boolean(profiledRequest && selected?.json !== profiledRequest.json);

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
            isDisabled={loading || !selected?.json}
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
      {hasRequestChanged ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileRequestChanged">
            <p>
              {selected?.json ? (
                <FormattedMessage
                  id="data.inspector.queryProfile.requestChangedDescription"
                  defaultMessage="The request has changed since this profile was taken. Profile again to see the new one."
                />
              ) : (
                <FormattedMessage
                  id="data.inspector.queryProfile.requestGoneDescription"
                  defaultMessage="The request is no longer available. This is the last profile that was taken."
                />
              )}
            </p>
          </EuiText>
        </>
      ) : null}
      {requests.length > 1 && selected ? (
        <>
          <EuiSpacer size="s" />
          <RequestPicker
            requests={requests}
            selected={selected}
            onSelect={(request) => setPicked({ id: request.id, name: request.name })}
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
      ) : view ? (
        <>
          <ProfileSummary view={view} />
          <ProfileDetails view={view} requestId={profiledRequest?.id} />
        </>
      ) : !selected?.json ? (
        <EuiText size="s" color="subdued" data-test-subj="esqlQueryProfileNoRequest">
          <p>
            <FormattedMessage
              id="data.inspector.queryProfile.noRequestDescription"
              defaultMessage="There is no ES|QL request to profile."
            />
          </p>
        </EuiText>
      ) : (
        <ProfileLoading />
      )}
    </div>
  );
};
