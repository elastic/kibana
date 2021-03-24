/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiLoadingSpinner,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { catchError, map, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { CoreStart } from '../../../../src/core/public';
import { mountReactNode } from '../../../../src/core/public/utils';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import { PLUGIN_ID } from '../../common';

import {
  connectToQueryState,
  DataPublicPluginStart,
  IEsSearchRequest,
  IEsSearchResponse,
  IndexPattern,
  IndexPatternField,
  isCompleteResponse,
  isErrorResponse,
  QueryState,
  SearchSessionState,
  TimeRange,
} from '../../../../src/plugins/data/public';
import {
  createStateContainer,
  useContainerState,
} from '../../../../src/plugins/kibana_utils/public';
import {
  getInitialStateFromUrl,
  SEARCH_SESSIONS_EXAMPLES_APP_URL_GENERATOR,
  SearchSessionExamplesUrlGeneratorState,
} from './url_generator';

interface SearchSessionsExampleAppDeps {
  notifications: CoreStart['notifications'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
}

/**
 * This example is an app with a step by step guide
 * walking through search session lifecycle
 * These enum represents all important steps in this demo
 */
enum DemoStep {
  ConfigureQuery,
  RunSession,
  SaveSession,
  RestoreSessionOnScreen,
  RestoreSessionViaManagement,
}

interface State extends QueryState {
  indexPatternId?: string;
  numericFieldName?: string;

  /**
   * If landed into the app with restore URL
   */
  restoreSessionId?: string;
}

export const SearchSessionsExampleApp = ({
  notifications,
  navigation,
  data,
}: SearchSessionsExampleAppDeps) => {
  const { IndexPatternSelect } = data.ui;

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [request, setRequest] = useState<IEsSearchRequest | null>(null);
  const [response, setResponse] = useState<IEsSearchResponse | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const nextRequestIdRef = useRef<number>(0);

  const [restoreRequest, setRestoreRequest] = useState<IEsSearchRequest | null>(null);
  const [restoreResponse, setRestoreResponse] = useState<IEsSearchResponse | null>(null);
  const [restoreTookMs, setRestoreTookMs] = useState<number | null>(null);

  const sessionState = useObservable(data.search.session.state$) || SearchSessionState.None;

  const demoStep: DemoStep = (() => {
    switch (sessionState) {
      case SearchSessionState.None:
      case SearchSessionState.Canceled:
        return DemoStep.ConfigureQuery;
      case SearchSessionState.Loading:
      case SearchSessionState.Completed:
        return DemoStep.RunSession;
      case SearchSessionState.BackgroundCompleted:
      case SearchSessionState.BackgroundLoading:
        return DemoStep.SaveSession;
      case SearchSessionState.Restored:
        return DemoStep.RestoreSessionOnScreen;
    }
  })();

  const {
    numericFieldName,
    indexPattern,
    selectedField,
    fields,
    setIndexPattern,
    setNumericFieldName,
    state,
  } = useAppState({ data });

  const isRestoring = !!state.restoreSessionId;

  const enableSessionStorage = useCallback(() => {
    data.search.session.enableStorage({
      getName: async () => 'Search sessions example',
      getUrlGeneratorData: async () => ({
        initialState: {
          time: data.query.timefilter.timefilter.getTime(),
          filters: data.query.filterManager.getFilters(),
          query: data.query.queryString.getQuery(),
          indexPatternId: indexPattern?.id,
          numericFieldName,
        } as SearchSessionExamplesUrlGeneratorState,
        restoreState: {
          time: data.query.timefilter.timefilter.getAbsoluteTime(),
          filters: data.query.filterManager.getFilters(),
          query: data.query.queryString.getQuery(),
          indexPatternId: indexPattern?.id,
          numericFieldName,
          searchSessionId: data.search.session.getSessionId(),
        } as SearchSessionExamplesUrlGeneratorState,
        urlGeneratorId: SEARCH_SESSIONS_EXAMPLES_APP_URL_GENERATOR,
      }),
    });
  }, [
    data.query.filterManager,
    data.query.queryString,
    data.query.timefilter.timefilter,
    data.search.session,
    indexPattern?.id,
    numericFieldName,
  ]);

  const reset = useCallback(() => {
    setRequest(null);
    setResponse(null);
    setRestoreRequest(null);
    setRestoreResponse(null);
    setTookMs(null);
    setRestoreTookMs(null);
    setIsSearching(false);
    data.search.session.clear();
    enableSessionStorage();
    nextRequestIdRef.current = 0;
  }, [
    setRequest,
    setResponse,
    setRestoreRequest,
    setRestoreResponse,
    setIsSearching,
    data.search.session,
    enableSessionStorage,
  ]);

  useEffect(() => {
    enableSessionStorage();
    return () => {
      data.search.session.clear();
    };
  }, [data.search.session, enableSessionStorage]);

  useEffect(() => {
    reset();
  }, [reset, state]);

  const search = useCallback(
    (restoreSearchSessionId?: string) => {
      if (!indexPattern) return;
      if (!numericFieldName) return;
      setIsSearching(true);
      const requestId = ++nextRequestIdRef.current;
      doSearch({ indexPattern, numericFieldName, restoreSearchSessionId }, { data, notifications })
        .then(({ response: res, request: req, tookMs: _tookMs }) => {
          if (requestId !== nextRequestIdRef.current) return; // no longer interested in this result
          if (restoreSearchSessionId) {
            setRestoreRequest(req);
            setRestoreResponse(res);
            setRestoreTookMs(_tookMs ?? null);
          } else {
            setRequest(req);
            setResponse(res);
            setTookMs(_tookMs ?? null);
          }
        })
        .finally(() => {
          if (requestId !== nextRequestIdRef.current) return; // no longer interested in this result
          setIsSearching(false);
        });
    },
    [data, notifications, indexPattern, numericFieldName]
  );

  useEffect(() => {
    if (state.restoreSessionId) {
      search(state.restoreSessionId);
    }
  }, [search, state.restoreSessionId]);

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Search session example</h1>
          </EuiTitle>
          <EuiSpacer />
          {!isShardDelayEnabled(data) && (
            <>
              <NoShardDelayCallout />
              <EuiSpacer />
            </>
          )}
          {!indexPattern && (
            <>
              <NoIndexPatternsCallout />
              <EuiSpacer />
            </>
          )}
          <EuiText>
            <p>
              This example shows how you can use <EuiCode>data.search.session</EuiCode> service to
              group your searches into a search session and allow user to save search results for
              later. <br />
              Start a long-running search, save the session and then restore it. See how fast search
              is completed when restoring the session comparing to when doing initial search. <br />
              <br />
              Follow this demo step-by-step:{' '}
              <b>configure the query, start the search and then save your session.</b> You can save
              your session both when search is still in progress or when it is completed. After you
              save the session and when initial search is completed you can{' '}
              <b>restore the session</b>: the search will re-run reusing previous results. It will
              finish a lot faster then the initial search. You can also{' '}
              <b>go to search sessions management</b> and <b>get back to the stored results</b> from
              there.
            </p>
          </EuiText>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          {!isRestoring && (
            <>
              <EuiTitle size="s">
                <h2>1. Configure the search query (OK to leave defaults)</h2>
              </EuiTitle>
              <navigation.ui.TopNavMenu
                appName={PLUGIN_ID}
                showSearchBar={true}
                useDefaultBehaviors={true}
                indexPatterns={indexPattern ? [indexPattern] : undefined}
                onQuerySubmit={reset}
              />
              <EuiFlexGroup justifyContent={'flexStart'}>
                <EuiFlexItem grow={false}>
                  <EuiFormLabel>Index Pattern</EuiFormLabel>
                  <IndexPatternSelect
                    placeholder={i18n.translate(
                      'searchSessionExample.selectIndexPatternPlaceholder',
                      {
                        defaultMessage: 'Select index pattern',
                      }
                    )}
                    indexPatternId={indexPattern?.id ?? ''}
                    onChange={(id) => {
                      if (!id) return;
                      setIndexPattern(id);
                    }}
                    isClearable={false}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormLabel>Numeric Field to Aggregate</EuiFormLabel>
                  <EuiComboBox
                    options={formatFieldsToComboBox(getNumeric(fields))}
                    selectedOptions={formatFieldToComboBox(selectedField)}
                    singleSelection={true}
                    onChange={(option) => {
                      const fld = indexPattern?.getFieldByName(option[0].label);
                      if (!fld) return;
                      setNumericFieldName(fld?.name);
                    }}
                    sortMatchesBy="startsWith"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size={'xl'} />
              <EuiTitle size="s">
                <h2>
                  2. Start the search using <EuiCode>data.search</EuiCode> service
                </h2>
              </EuiTitle>
              <EuiText style={{ maxWidth: 600 }}>
                In this example each search creates a new session by calling{' '}
                <EuiCode>data.search.session.start()</EuiCode> that returns a{' '}
                <EuiCode>searchSessionId</EuiCode>. Then this <EuiCode>searchSessionId</EuiCode> is
                passed into a search request.
                <EuiSpacer />
                <div>
                  {demoStep === DemoStep.ConfigureQuery && (
                    <EuiButtonEmpty
                      size="xs"
                      onClick={() => search()}
                      iconType="play"
                      disabled={isSearching || !indexPattern || !numericFieldName}
                      data-test-subj={'startSearch'}
                    >
                      Start the search from low-level client (data.search.search)
                    </EuiButtonEmpty>
                  )}
                  {isSearching && <EuiLoadingSpinner />}

                  {response && request && (
                    <SearchInspector
                      accordionId={'1'}
                      request={request}
                      response={response}
                      tookMs={tookMs}
                    />
                  )}
                </div>
              </EuiText>
              <EuiSpacer size={'xl'} />
              {(demoStep === DemoStep.RunSession ||
                demoStep === DemoStep.RestoreSessionOnScreen ||
                demoStep === DemoStep.SaveSession) && (
                <>
                  <EuiTitle size="s">
                    <h2>3. Save your session</h2>
                  </EuiTitle>
                  <EuiText style={{ maxWidth: 600 }}>
                    Use the search session indicator in the Kibana header to save the search
                    session.
                    <div>
                      <EuiButtonEmpty
                        size="xs"
                        iconType={'save'}
                        onClick={() => {
                          // hack for demo purposes:
                          document
                            .querySelector('[data-test-subj="searchSessionIndicator"]')
                            ?.querySelector('button')
                            ?.click();
                        }}
                        isDisabled={
                          demoStep === DemoStep.RestoreSessionOnScreen ||
                          demoStep === DemoStep.SaveSession
                        }
                      >
                        Try saving the session using the search session indicator in the header.
                      </EuiButtonEmpty>
                    </div>
                  </EuiText>
                </>
              )}
              {(demoStep === DemoStep.RestoreSessionOnScreen ||
                demoStep === DemoStep.SaveSession) && (
                <>
                  <EuiSpacer size={'xl'} />
                  <EuiTitle size="s">
                    <h2>4. Restore the session</h2>
                  </EuiTitle>
                  <EuiText style={{ maxWidth: 600 }}>
                    Now you can restore your saved session. The same search request completes
                    significantly faster because it reuses stored results.
                    <EuiSpacer />
                    <div>
                      {!isSearching && !restoreResponse && (
                        <EuiButtonEmpty
                          size="xs"
                          iconType={'refresh'}
                          onClick={() => {
                            search(data.search.session.getSessionId());
                          }}
                          data-test-subj={'restoreSearch'}
                        >
                          Restore the search session
                        </EuiButtonEmpty>
                      )}
                      {isSearching && <EuiLoadingSpinner />}

                      {restoreRequest && restoreResponse && (
                        <SearchInspector
                          accordionId={'2'}
                          request={restoreRequest}
                          response={restoreResponse}
                          tookMs={restoreTookMs}
                        />
                      )}
                    </div>
                  </EuiText>
                </>
              )}
              {demoStep === DemoStep.RestoreSessionOnScreen && (
                <>
                  <EuiSpacer size={'xl'} />
                  <EuiTitle size="s">
                    <h2>5. Restore from Management</h2>
                  </EuiTitle>
                  <EuiText style={{ maxWidth: 600 }}>
                    You can also get back to your session from the Search Session Management.
                    <div>
                      <EuiButtonEmpty
                        size="xs"
                        onClick={() => {
                          // hack for demo purposes:
                          document
                            .querySelector('[data-test-subj="searchSessionIndicator"]')
                            ?.querySelector('button')
                            ?.click();
                        }}
                      >
                        Use Search Session indicator to navigate to management
                      </EuiButtonEmpty>
                    </div>
                  </EuiText>
                </>
              )}
            </>
          )}
          {isRestoring && (
            <>
              <EuiTitle size="s">
                <h2>You restored the search session!</h2>
              </EuiTitle>
              <EuiSpacer />
              <EuiText style={{ maxWidth: 600 }}>
                {isSearching && <EuiLoadingSpinner />}

                {restoreRequest && restoreResponse && (
                  <SearchInspector
                    accordionId={'2'}
                    request={restoreRequest}
                    response={restoreResponse}
                    tookMs={restoreTookMs}
                  />
                )}
              </EuiText>
            </>
          )}
          <EuiSpacer size={'xl'} />
          <EuiButtonEmpty
            onClick={() => {
              // hack to quickly reset all the state and remove state stuff from the URL
              window.location.assign(window.location.href.split('?')[0]);
            }}
          >
            Start again
          </EuiButtonEmpty>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};

function SearchInspector({
  accordionId,
  response,
  request,
  tookMs,
}: {
  accordionId: string;
  response: IEsSearchResponse;
  request: IEsSearchRequest;
  tookMs: number | null;
}) {
  return (
    <div data-test-subj={`searchResults-${accordionId}`}>
      The search took: {tookMs ? Math.round(tookMs) : 'unknown'}ms
      <EuiAccordion id={accordionId} buttonContent="Request / response">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>Request</h4>
            </EuiTitle>
            <EuiText size="xs">Search body sent to ES</EuiText>
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="s"
              overflowHeight={450}
              isCopyable
            >
              {JSON.stringify(request, null, 2)}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>Response</h4>
            </EuiTitle>
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="s"
              overflowHeight={450}
              isCopyable
            >
              {JSON.stringify(response, null, 2)}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </div>
  );
}

function useAppState({ data }: { data: DataPublicPluginStart }) {
  const stateContainer = useMemo(() => {
    const {
      filters,
      time,
      searchSessionId,
      numericFieldName,
      indexPatternId,
      query,
    } = getInitialStateFromUrl();

    if (filters) {
      data.query.filterManager.setFilters(filters);
    }

    if (query) {
      data.query.queryString.setQuery(query);
    }

    if (time) {
      data.query.timefilter.timefilter.setTime(time);
    }

    return createStateContainer<State>({
      restoreSessionId: searchSessionId,
      numericFieldName,
      indexPatternId,
    });
  }, [data.query.filterManager, data.query.queryString, data.query.timefilter.timefilter]);
  const setState = useCallback(
    (state: Partial<State>) => stateContainer.set({ ...stateContainer.get(), ...state }),
    [stateContainer]
  );
  const state = useContainerState(stateContainer);
  useEffect(() => {
    return connectToQueryState(data.query, stateContainer, {
      time: true,
      query: true,
      filters: true,
      refreshInterval: false,
    });
  }, [stateContainer, data.query]);

  const [fields, setFields] = useState<IndexPatternField[]>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | null>();

  // Fetch the default index pattern using the `data.indexPatterns` service, as the component is mounted.
  useEffect(() => {
    let canceled = false;
    const loadIndexPattern = async () => {
      // eslint-disable-next-line no-console
      console.warn('Loading default index pattern');
      let loadedIndexPattern = state.indexPatternId
        ? await data.indexPatterns.get(state.indexPatternId)
        : await data.indexPatterns.getDefault();
      if (!loadedIndexPattern) {
        // try to find any available index pattern
        const [id] = await data.indexPatterns.getIds(true);
        if (id) {
          loadedIndexPattern = await data.indexPatterns.get(id);
        }
      }
      if (canceled) return;
      if (!loadedIndexPattern) {
        // eslint-disable-next-line no-console
        console.warn('No index patterns to pick from');
        return;
      }
      if (!state.indexPatternId) {
        setState({
          indexPatternId: loadedIndexPattern.id,
        });
      }

      setIndexPattern(loadedIndexPattern);
    };

    loadIndexPattern();
    return () => {
      canceled = true;
    };
  }, [data, setState, state.indexPatternId]);

  // Update the fields list every time the index pattern is modified.
  useEffect(() => {
    setFields(indexPattern?.fields);
  }, [indexPattern]);
  useEffect(() => {
    if (state.numericFieldName) return;
    setState({ numericFieldName: fields?.length ? getNumeric(fields)[0]?.name : undefined });
  }, [setState, fields, state.numericFieldName]);

  const selectedField: IndexPatternField | undefined = useMemo(
    () => indexPattern?.fields.find((field) => field.name === state.numericFieldName),
    [indexPattern?.fields, state.numericFieldName]
  );

  return {
    selectedField,
    indexPattern,
    numericFieldName: state.numericFieldName,
    fields,
    setNumericFieldName: (field: string) => setState({ numericFieldName: field }),
    setIndexPattern: (indexPatternId: string) => setState({ indexPatternId }),
    state,
  };
}

function doSearch(
  {
    indexPattern,
    numericFieldName,
    restoreSearchSessionId,
  }: {
    indexPattern: IndexPattern;
    numericFieldName: string;
    restoreSearchSessionId?: string;
  },
  {
    data,
    notifications,
  }: { data: DataPublicPluginStart; notifications: CoreStart['notifications'] }
): Promise<{ request: IEsSearchRequest; response: IEsSearchResponse; tookMs?: number }> {
  if (!indexPattern) return Promise.reject('Select an index patten');
  if (!numericFieldName) return Promise.reject('Select a field to aggregate on');

  // start a new session or restore an existing one
  let restoreTimeRange: TimeRange | undefined;
  if (restoreSearchSessionId) {
    // when restoring need to make sure we are forcing absolute time range
    restoreTimeRange = data.query.timefilter.timefilter.getAbsoluteTime();
    data.search.session.restore(restoreSearchSessionId);
  }
  const sessionId = restoreSearchSessionId ? restoreSearchSessionId : data.search.session.start();

  // Construct the query portion of the search request
  const query = data.query.getEsQuery(indexPattern, restoreTimeRange);

  // Construct the aggregations portion of the search request by using the `data.search.aggs` service.

  const aggs = isShardDelayEnabled(data)
    ? [
        { type: 'avg', params: { field: numericFieldName } },
        { type: 'shard_delay', params: { delay: '5s' } },
      ]
    : [{ type: 'avg', params: { field: numericFieldName } }];

  const aggsDsl = data.search.aggs.createAggConfigs(indexPattern, aggs).toDsl();

  const req = {
    params: {
      index: indexPattern.title,
      body: {
        aggs: aggsDsl,
        query,
      },
    },
  };

  const startTs = performance.now();

  // Submit the search request using the `data.search` service.
  return data.search
    .search(req, { sessionId })
    .pipe(
      tap((res) => {
        if (isCompleteResponse(res)) {
          const avgResult: number | undefined = res.rawResponse.aggregations
            ? res.rawResponse.aggregations[1]?.value ?? res.rawResponse.aggregations[2]?.value
            : undefined;
          const message = (
            <EuiText>
              Searched {res.rawResponse.hits.total} documents. <br />
              The average of {numericFieldName} is {avgResult ? Math.floor(avgResult) : 0}
              .
              <br />
            </EuiText>
          );
          notifications.toasts.addSuccess({
            title: 'Query result',
            text: mountReactNode(message),
          });
        } else if (isErrorResponse(res)) {
          notifications.toasts.addWarning('An error has occurred');
        }
      }),
      map((res) => ({ response: res, request: req, tookMs: performance.now() - startTs })),
      catchError((e) => {
        notifications.toasts.addDanger('Failed to run search');
        return of({ request: req, response: e });
      })
    )
    .toPromise();
}

function getNumeric(fields?: IndexPatternField[]) {
  if (!fields) return [];
  return fields?.filter((f) => f.type === 'number' && f.aggregatable);
}

function formatFieldToComboBox(field?: IndexPatternField | null) {
  if (!field) return [];
  return formatFieldsToComboBox([field]);
}

function formatFieldsToComboBox(fields?: IndexPatternField[]) {
  if (!fields) return [];

  return fields?.map((field) => {
    return {
      label: field.displayName || field.name,
    };
  });
}

/**
 * To make this demo more convincing it uses `shardDelay` agg which adds artificial delay to a search request,
 * to enable `shardDelay` make sure to set `data.search.aggs.shardDelay.enabled: true` in your kibana.dev.yml
 */
function isShardDelayEnabled(data: DataPublicPluginStart): boolean {
  try {
    return !!data.search.aggs.types.get('shard_delay');
  } catch (e) {
    return false;
  }
}

function NoShardDelayCallout() {
  return (
    <EuiCallOut
      title={
        <>
          <EuiCode>shardDelay</EuiCode> is missing!
        </>
      }
      color="warning"
      iconType="help"
    >
      <p>
        This demo works best with <EuiCode>shardDelay</EuiCode> aggregation which simulates slow
        queries. <br />
        We recommend to enable it in your <EuiCode>kibana.dev.yml</EuiCode>:
      </p>
      <EuiCodeBlock isCopyable={true}>data.search.aggs.shardDelay.enabled: true</EuiCodeBlock>
    </EuiCallOut>
  );
}

function NoIndexPatternsCallout() {
  return (
    <EuiCallOut title={<>Missing index patterns!</>} color="warning" iconType="help">
      <p>This demo requires at least one index pattern.</p>
    </EuiCallOut>
  );
}
