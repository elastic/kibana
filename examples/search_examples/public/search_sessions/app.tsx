/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
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
  SearchSessionState,
} from '../../../../src/plugins/data/public';

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

export const SearchSessionsExampleApp = ({
  notifications,
  navigation,
  data,
}: SearchSessionsExampleAppDeps) => {
  const { IndexPatternSelect } = data.ui;
  const [indexPattern, setIndexPattern] = useState<IndexPattern | null>();
  const [fields, setFields] = useState<IndexPatternField[]>();
  const [selectedFields, setSelectedFields] = useState<IndexPatternField[]>([]);
  const [selectedNumericField, setSelectedNumericField] = useState<
    IndexPatternField | null | undefined
  >();

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
    const setDefaultIndexPattern = async () => {
      const defaultIndexPattern = await data.indexPatterns.getDefault();
      setIndexPattern(defaultIndexPattern);
    };

    setDefaultIndexPattern();
  }, [data]);

  // Update the fields list every time the index pattern is modified.
  useEffect(() => {
    setFields(indexPattern?.fields);
  }, [indexPattern]);
  useEffect(() => {
    setSelectedNumericField(fields?.length ? getNumeric(fields)[0] : null);
  }, [fields]);

  const doAsyncSearch = async (restoreSearchSessionId?: string) => {
    if (!indexPattern || !selectedNumericField) return;

    // start a new session or restore an existing one
    if (restoreSearchSessionId) {
      data.query.timefilter.timefilter.setTime(data.query.timefilter.timefilter.getAbsoluteTime()); // force absolute time range when restoring a session
      data.search.session.restore(restoreSearchSessionId);
    }
    const sessionId = restoreSearchSessionId ? restoreSearchSessionId : data.search.session.start();

    // Construct the query portion of the search request
    const query = data.query.getEsQuery(indexPattern);

    // Construct the aggregations portion of the search request by using the `data.search.aggs` service.
    const aggs = [{ type: 'avg', params: { field: selectedNumericField!.name } }];
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
              The average of {selectedNumericField!.name} is {avgResult ? Math.floor(avgResult) : 0}
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
                indexPatternId={indexPattern?.id || ''}
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
                selectedOptions={formatFieldToComboBox(selectedNumericField)}
                singleSelection={true}
                onChange={(option) => {
                  const fld = indexPattern?.getFieldByName(option[0].label);
                  setSelectedNumericField(fld || null);
                }}
                sortMatchesBy="startsWith"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormLabel>Fields to query (leave blank to include all fields)</EuiFormLabel>
              <EuiComboBox
                options={formatFieldsToComboBox(fields)}
                selectedOptions={formatFieldsToComboBox(selectedFields)}
                singleSelection={false}
                onChange={(option) => {
                  const flds = option
                    .map((opt) => indexPattern?.getFieldByName(opt?.label))
                    .filter((f) => f);
                  setSelectedFields(flds.length ? (flds as IndexPatternField[]) : []);
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
