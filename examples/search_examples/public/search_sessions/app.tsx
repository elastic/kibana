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

import { CoreStart } from '../../../../src/core/public';
import { mountReactNode } from '../../../../src/core/public/utils';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import { PLUGIN_ID } from '../../common';

import {
  connectToQueryState,
  DataPublicPluginStart,
  IndexPattern,
  IndexPatternField,
  isCompleteResponse,
  isErrorResponse,
  QueryState,
  SearchSessionState,
} from '../../../../src/plugins/data/public';
import {
  createStateContainer,
  useContainerState,
} from '../../../../src/plugins/kibana_utils/public';

interface SearchSessionsExampleAppDeps {
  notifications: CoreStart['notifications'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
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

interface State extends QueryState {
  indexPatternId?: string;
  numericFieldName?: string;
}

export const SearchSessionsExampleApp = ({
  notifications,
  navigation,
  data,
}: SearchSessionsExampleAppDeps) => {
  const { IndexPatternSelect } = data.ui;

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
  const [request, setRequest] = useState<Record<string, any> | null>(null);
  const [response, setResponse] = useState<Record<string, any> | null>(null);

  const isStarted = !!request;
  const isLoading = !!request && !response;
  const isLoaded = !!response;

  const [restoreRequest, setRestoreRequest] = useState<Record<string, any> | null>(null);
  const [restoreResponse, setRestoreResponse] = useState<Record<string, any> | null>(null);

  const isRestoreStarted = !!restoreRequest;
  const isRestoreLoading = !!restoreRequest && !restoreResponse;
  const isRestoreLoaded = !!restoreResponse;

  // const reset = useCallback(() => {
  //   setRequest(null);
  //   setResponse(null);
  //   setRestoreRequest(null);
  //   setRestoreResponse(null);
  // }, [setRequest, setResponse, setRestoreRequest, setRestoreResponse]);

  const sessionState = useObservable(data.search.session.state$) || SearchSessionState.None;

  useEffect(() => {
    data.search.session.enableStorage({
      getName: async () => 'Search sessions example',
      getUrlGeneratorData: async () => ({
        initialState: {},
        restoreState: {},
        urlGeneratorId: 'searchSessionExample',
      }),
    });

    return () => {
      data.search.session.clear();
    };
  }, [data.search.session]);

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

  const doAsyncSearch = async (restoreSearchSessionId?: string) => {
    if (!indexPattern || !state.numericFieldName) return;

    // start a new session or restore an existing one
    if (restoreSearchSessionId) {
      data.query.timefilter.timefilter.setTime(data.query.timefilter.timefilter.getAbsoluteTime()); // force absolute time range when restoring a session
      data.search.session.restore(restoreSearchSessionId);
    }
    const sessionId = restoreSearchSessionId ? restoreSearchSessionId : data.search.session.start();

    // Construct the query portion of the search request
    const query = data.query.getEsQuery(indexPattern);

    // Construct the aggregations portion of the search request by using the `data.search.aggs` service.
    const aggs = [{ type: 'avg', params: { field: state.numericFieldName } }];
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
    if (restoreSearchSessionId) {
      setRestoreRequest(req.params.body);
    } else {
      setRequest(req.params.body);
    }

    const searchSubscription$ = data.search.search(req, { sessionId }).subscribe({
      next: (res) => {
        if (isCompleteResponse(res)) {
          if (restoreSearchSessionId) {
            setRestoreResponse(res.rawResponse);
          } else {
            setResponse(res.rawResponse);
          }
          const avgResult: number | undefined = res.rawResponse.aggregations
            ? res.rawResponse.aggregations[1].value
            : undefined;
          const message = (
            <EuiText>
              Searched {res.rawResponse.hits.total} documents. <br />
              The average of {state.numericFieldName} is {avgResult ? Math.floor(avgResult) : 0}
              .
              <br />
            </EuiText>
          );
          notifications.toasts.addSuccess({
            title: 'Query result',
            text: mountReactNode(message),
          });

          searchSubscription$.unsubscribe();
        } else if (isErrorResponse(res)) {
          // TODO: Make response error status clearer
          notifications.toasts.addWarning('An error has occurred');
          searchSubscription$.unsubscribe();
        }
      },
      error: () => {
        notifications.toasts.addDanger('Failed to run search');
      },
    });
  };

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
                indexPatternId={state.indexPatternId ?? ''}
                onChange={async (newIndexPatternId: any) => {
                  const newIndexPattern = await data.indexPatterns.get(newIndexPatternId);
                  setIndexPattern(newIndexPattern);
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
                  setState({
                    numericFieldName: fld?.name,
                  });
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
              {!isStarted && (
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => doAsyncSearch()}
                  iconType="play"
                  disabled={
                    [
                      SearchSessionState.BackgroundLoading,
                      SearchSessionState.BackgroundCompleted,
                    ].includes(sessionState) || isRestoreStarted
                  }
                >
                  Start the search from low-level client (data.search.search)
                </EuiButtonEmpty>
              )}
              {isLoading && <EuiLoadingSpinner />}

              {isLoaded && (
                <SearchInspector accordionId={'1'} request={request!} response={response!} />
              )}
            </div>
          </EuiText>
          <EuiSpacer size={'xl'} />
          {isStarted && (
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
          {([SearchSessionState.BackgroundLoading, SearchSessionState.BackgroundCompleted].includes(
            sessionState
          ) ||
            isRestoreStarted) && (
            <>
              <EuiSpacer size={'xl'} />
              <EuiTitle size="s">
                <h2>4. Restore the session</h2>
              </EuiTitle>
              <EuiText style={{ maxWidth: 600 }}>
                Now you can restore your saved session. The same search request completes
                significantly faster because it reuses stored results.
                <div>
                  {!isRestoreStarted && (
                    <EuiButtonEmpty
                      size="xs"
                      iconType={'refresh'}
                      onClick={() => {
                        doAsyncSearch(data.search.session.getSessionId());
                      }}
                    >
                      Restore the search session
                    </EuiButtonEmpty>
                  )}
                  {isRestoreLoading && <EuiLoadingSpinner />}

                  {isRestoreLoaded && (
                    <SearchInspector
                      accordionId={'2'}
                      request={restoreRequest!}
                      response={restoreResponse!}
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
  response: Record<string, any>;
  request: Record<string, any>;
}) {
  return (
    <div>
      The search took: {response.took}ms
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
                values={{ time: response.took ?? 'Unknown' }}
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
