/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiAccordion,
  EuiButtonEmpty,
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

interface SearchSessionsExampleAppDeps {
  notifications: CoreStart['notifications'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  shardDelayEnabled: boolean;
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
}

export const SearchSessionsExampleApp = ({
  notifications,
  navigation,
  data,
  shardDelayEnabled,
}: SearchSessionsExampleAppDeps) => {
  const { IndexPatternSelect } = data.ui;

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [request, setRequest] = useState<IEsSearchRequest | null>(null);
  const [response, setResponse] = useState<IEsSearchResponse | null>(null);
  const [restoreRequest, setRestoreRequest] = useState<IEsSearchRequest | null>(null);
  const [restoreResponse, setRestoreResponse] = useState<IEsSearchResponse | null>(null);

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

  const enableSessionStorage = useCallback(() => {
    data.search.session.enableStorage({
      getName: async () => 'Search sessions example',
      getUrlGeneratorData: async () => ({
        initialState: {},
        restoreState: {},
        urlGeneratorId: 'searchSessionExample',
      }),
    });
  }, [data.search.session]);

  const reset = useCallback(() => {
    setRequest(null);
    setResponse(null);
    setRestoreRequest(null);
    setRestoreResponse(null);
    setIsSearching(false);
    data.search.session.clear();
    enableSessionStorage();
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

  const {
    numericFieldName,
    indexPattern,
    selectedField,
    fields,
    setIndexPattern,
    setNumericFieldName,
    state,
  } = useAppState({ data });

  useEffect(() => {
    reset();
  }, [reset, state]);

  const search = useCallback(
    (restoreSearchSessionId?: string) => {
      if (!indexPattern) return;
      if (!numericFieldName) return;
      setIsSearching(true);
      doSearch({ indexPattern, numericFieldName, restoreSearchSessionId }, { data, notifications })
        .then(({ response: res, request: req }) => {
          if (restoreSearchSessionId) {
            setRestoreRequest(req);
            setRestoreResponse(res);
          } else {
            setRequest(req);
            setResponse(res);
          }
        })
        .finally(() => {
          setIsSearching(false);
        });
    },
    [data, notifications, indexPattern, numericFieldName]
  );

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Basic search session example</h1>
          </EuiTitle>
          <EuiSpacer />
          <EuiText>
            <p>
              This example shows how you can use <EuiCode>data.search.session</EuiCode> service to
              group your searches into a search session and allow user to save search results for
              later. <br />
              Start a long-running search, save the session and then restore it. See how fast search
              is completed when restoring the session.
            </p>
          </EuiText>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiTitle size="s">
            <h2>1. Configure the search query</h2>
          </EuiTitle>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            useDefaultBehaviors={true}
            indexPatterns={indexPattern ? [indexPattern] : undefined}
          />
          <EuiFlexGroup justifyContent={'flexStart'}>
            <EuiFlexItem grow={false}>
              <EuiFormLabel>Index Pattern</EuiFormLabel>
              <IndexPatternSelect
                placeholder={i18n.translate('searchSessionExample.selectIndexPatternPlaceholder', {
                  defaultMessage: 'Select index pattern',
                })}
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
                  disabled={isSearching}
                >
                  Start the search from low-level client (data.search.search)
                </EuiButtonEmpty>
              )}
              {isSearching && <EuiLoadingSpinner />}

              {response && request && (
                <SearchInspector accordionId={'1'} request={request} response={response} />
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
                Use the search session indicator in the Kibana header to save the search session.
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
                  >
                    Try saving the session using the search session indicator in the header.
                  </EuiButtonEmpty>
                </div>
              </EuiText>
            </>
          )}
          {(demoStep === DemoStep.RestoreSessionOnScreen || demoStep === DemoStep.SaveSession) && (
            <>
              <EuiSpacer size={'xl'} />
              <EuiTitle size="s">
                <h2>4. Restore the session</h2>
              </EuiTitle>
              <EuiText style={{ maxWidth: 600 }}>
                Now you can restore your saved session. The same search request completes
                significantly faster because it reuses stored results.
                <div>
                  {!isSearching && (
                    <EuiButtonEmpty
                      size="xs"
                      iconType={'refresh'}
                      onClick={() => {
                        search(data.search.session.getSessionId());
                      }}
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
                    />
                  )}
                </div>
              </EuiText>
            </>
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};

function SearchInspector({
  accordionId,
  response,
  request,
}: {
  accordionId: string;
  response: IEsSearchResponse;
  request: IEsSearchRequest;
}) {
  return (
    <div>
      The search took: {response.rawResponse.took}ms
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
            <EuiText size="xs">
              <FormattedMessage
                id="searchExamples.timestampText"
                defaultMessage="Took: {time} ms"
                values={{ time: response.rawResponse.took ?? 'Unknown' }}
              />
            </EuiText>
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
    return createStateContainer<State>({});
  }, []);
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
      const loadedIndexPattern = state.indexPatternId
        ? await data.indexPatterns.get(state.indexPatternId)
        : await data.indexPatterns.getDefault();
      if (canceled) return;
      if (!loadedIndexPattern) return;
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
    setState({ numericFieldName: fields?.length ? getNumeric(fields)[0]?.name : undefined });
  }, [setState, fields]);

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
): Promise<{ request: IEsSearchRequest; response: IEsSearchResponse }> {
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
  const aggs = [{ type: 'avg', params: { field: numericFieldName } }];
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

  // Submit the search request using the `data.search` service.
  return data.search
    .search(req, { sessionId })
    .pipe(
      tap((res) => {
        if (isCompleteResponse(res)) {
          const avgResult: number | undefined = res.rawResponse.aggregations
            ? res.rawResponse.aggregations[1].value
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
      map((res) => ({ response: res, request: req })),
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
