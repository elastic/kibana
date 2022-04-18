/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiCheckbox,
  EuiSpacer,
  EuiCode,
  EuiComboBox,
  EuiFormLabel,
  EuiFieldNumber,
  EuiProgress,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';

import { lastValueFrom } from 'rxjs';
import { CoreStart } from '@kbn/core/public';
import { mountReactNode } from '@kbn/core/public/utils';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import {
  DataPublicPluginStart,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { IMyStrategyResponse } from '../../common/types';
import { PLUGIN_ID, PLUGIN_NAME, SERVER_SEARCH_ROUTE_PATH } from '../../common';

interface SearchExamplesAppDeps {
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

function getNumeric(fields?: DataViewField[]) {
  if (!fields) return [];
  return fields?.filter((f) => f.type === 'number' && f.aggregatable);
}

function getAggregatableStrings(fields?: DataViewField[]) {
  if (!fields) return [];
  return fields?.filter((f) => f.type === 'string' && f.aggregatable);
}

function formatFieldToComboBox(field?: DataViewField | null) {
  if (!field) return [];
  return formatFieldsToComboBox([field]);
}

function formatFieldsToComboBox(fields?: DataViewField[]) {
  if (!fields) return [];

  return fields?.map((field) => {
    return {
      label: field.displayName || field.name,
    };
  });
}

export const SearchExamplesApp = ({
  http,
  notifications,
  navigation,
  data,
  unifiedSearch,
}: SearchExamplesAppDeps) => {
  const { IndexPatternSelect } = unifiedSearch.ui;
  const [getCool, setGetCool] = useState<boolean>(false);
  const [fibonacciN, setFibonacciN] = useState<number>(10);
  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [total, setTotal] = useState<number>(100);
  const [loaded, setLoaded] = useState<number>(0);
  const [dataView, setDataView] = useState<DataView | null>();
  const [fields, setFields] = useState<DataViewField[]>();
  const [selectedFields, setSelectedFields] = useState<DataViewField[]>([]);
  const [selectedNumericField, setSelectedNumericField] = useState<
    DataViewField | null | undefined
  >();
  const [selectedBucketField, setSelectedBucketField] = useState<
    DataViewField | null | undefined
  >();
  const [request, setRequest] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAbortController, setAbortController] = useState<AbortController>();
  const [rawResponse, setRawResponse] = useState<Record<string, any>>({});
  const [selectedTab, setSelectedTab] = useState(0);

  function setResponse(response: IKibanaSearchResponse) {
    setRawResponse(response.rawResponse);
    setLoaded(response.loaded!);
    setTotal(response.total!);
    setTimeTook(response.rawResponse.took);
  }

  // Fetch the default data view using the `data.dataViews` service, as the component is mounted.
  useEffect(() => {
    const setDefaultDataView = async () => {
      const defaultDataView = await data.dataViews.getDefault();
      setDataView(defaultDataView);
    };

    setDefaultDataView();
  }, [data]);

  // Update the fields list every time the data view is modified.
  useEffect(() => {
    setFields(dataView?.fields);
  }, [dataView]);
  useEffect(() => {
    setSelectedBucketField(fields?.length ? getAggregatableStrings(fields)[0] : null);
    setSelectedNumericField(fields?.length ? getNumeric(fields)[0] : null);
  }, [fields]);

  const doAsyncSearch = async (
    strategy?: string,
    sessionId?: string,
    addWarning: boolean = false,
    addError: boolean = false
  ) => {
    if (!dataView || !selectedNumericField) return;

    // Construct the query portion of the search request
    const query = data.query.getEsQuery(dataView);

    if (addWarning) {
      query.bool.must.push({
        // @ts-ignore
        error_query: {
          indices: [
            {
              name: dataView.title,
              error_type: 'warning',
              message: 'Watch out!',
            },
          ],
        },
      });
    }
    if (addError) {
      query.bool.must.push({
        // @ts-ignore
        error_query: {
          indices: [
            {
              name: dataView.title,
              error_type: 'exception',
              message: 'Watch out!',
            },
          ],
        },
      });
    }

    // Construct the aggregations portion of the search request by using the `data.search.aggs` service.
    const aggs = [{ type: 'avg', params: { field: selectedNumericField!.name } }];
    const aggsDsl = data.search.aggs.createAggConfigs(dataView, aggs).toDsl();

    const req = {
      params: {
        index: dataView.title,
        body: {
          aggs: aggsDsl,
          query,
        },
      },
      // Add a custom request parameter to be consumed by `MyStrategy`.
      ...(strategy ? { get_cool: getCool } : {}),
    };

    const abortController = new AbortController();
    setAbortController(abortController);

    // Submit the search request using the `data.search` service.
    setRequest(req.params.body);
    setIsLoading(true);

    data.search
      .search(req, {
        strategy,
        sessionId,
        abortSignal: abortController.signal,
      })
      .subscribe({
        next: (res) => {
          if (isCompleteResponse(res)) {
            setIsLoading(false);
            setResponse(res);
            const avgResult: number | undefined = res.rawResponse.aggregations
              ? // @ts-expect-error @elastic/elasticsearch no way to declare a type for aggregation in the search response
                res.rawResponse.aggregations[1].value
              : undefined;
            const isCool = (res as IMyStrategyResponse).cool;
            const executedAt = (res as IMyStrategyResponse).executed_at;
            const message = (
              <EuiText>
                Searched {res.rawResponse.hits.total} documents. <br />
                The average of {selectedNumericField!.name} is{' '}
                {avgResult ? Math.floor(avgResult) : 0}.
                <br />
                {isCool ? `Is it Cool? ${isCool}` : undefined}
                <br />
                <EuiText data-test-subj="requestExecutedAt">
                  {executedAt ? `Executed at? ${executedAt}` : undefined}
                </EuiText>
              </EuiText>
            );
            notifications.toasts.addSuccess(
              {
                title: 'Query result',
                text: mountReactNode(message),
              },
              {
                toastLifeTimeMs: 300000,
              }
            );
            if (res.warning) {
              notifications.toasts.addWarning({
                title: 'Warning',
                text: mountReactNode(res.warning),
              });
            }
          } else if (isErrorResponse(res)) {
            // TODO: Make response error status clearer
            notifications.toasts.addDanger('An error has occurred');
          }
        },
        error: (e) => {
          setIsLoading(false);
          if (e instanceof AbortError) {
            notifications.toasts.addWarning({
              title: e.message,
            });
          } else {
            notifications.toasts.addDanger({
              title: 'Failed to run search',
              text: e.message,
            });
          }
        },
      });
  };

  const doSearchSourceSearch = async (otherBucket: boolean) => {
    if (!dataView) return;

    const query = data.query.queryString.getQuery();
    const filters = data.query.filterManager.getFilters();
    const timefilter = data.query.timefilter.timefilter.createFilter(dataView);
    if (timefilter) {
      filters.push(timefilter);
    }

    try {
      const searchSource = await data.search.searchSource.create();

      searchSource
        .setField('index', dataView)
        .setField('filter', filters)
        .setField('query', query)
        .setField('fields', selectedFields.length ? selectedFields.map((f) => f.name) : [''])
        .setField('size', selectedFields.length ? 100 : 0)
        .setField('trackTotalHits', 100);

      const aggDef = [];
      if (selectedBucketField) {
        aggDef.push({
          type: 'terms',
          schema: 'split',
          params: { field: selectedBucketField.name, size: 2, otherBucket },
        });
      }
      if (selectedNumericField) {
        aggDef.push({ type: 'avg', params: { field: selectedNumericField.name } });
      }
      if (aggDef.length > 0) {
        const ac = data.search.aggs.createAggConfigs(dataView, aggDef);
        searchSource.setField('aggs', ac);
      }

      setRequest(searchSource.getSearchRequestBody());
      const abortController = new AbortController();
      setAbortController(abortController);
      setIsLoading(true);
      const { rawResponse: res } = await lastValueFrom(
        searchSource.fetch$({ abortSignal: abortController.signal })
      );
      setRawResponse(res);

      const message = <EuiText>Searched {res.hits.total} documents.</EuiText>;
      notifications.toasts.addSuccess(
        {
          title: 'Query result',
          text: mountReactNode(message),
        },
        {
          toastLifeTimeMs: 300000,
        }
      );
    } catch (e) {
      setRawResponse(e.body);
      if (e instanceof AbortError) {
        notifications.toasts.addWarning({
          title: e.message,
        });
      } else {
        notifications.toasts.addDanger({
          title: 'Failed to run search',
          text: e.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onClickHandler = () => {
    doAsyncSearch();
  };

  const onMyStrategyClickHandler = () => {
    doAsyncSearch('myStrategy');
  };

  const onWarningSearchClickHandler = () => {
    doAsyncSearch(undefined, undefined, true);
  };

  const onErrorSearchClickHandler = () => {
    doAsyncSearch(undefined, undefined, false, true);
  };

  const onPartialResultsClickHandler = () => {
    setSelectedTab(1);
    const req = {
      params: {
        n: fibonacciN,
      },
    };

    const abortController = new AbortController();
    setAbortController(abortController);

    // Submit the search request using the `data.search` service.
    setRequest(req.params);
    setIsLoading(true);
    data.search
      .search(req, {
        strategy: 'fibonacciStrategy',
        abortSignal: abortController.signal,
      })
      .subscribe({
        next: (res) => {
          setResponse(res);
          if (isCompleteResponse(res)) {
            setIsLoading(false);
            notifications.toasts.addSuccess({
              title: 'Query result',
              text: 'Query finished',
            });
          } else if (isErrorResponse(res)) {
            setIsLoading(false);
            // TODO: Make response error status clearer
            notifications.toasts.addWarning('An error has occurred');
          }
        },
        error: (e) => {
          setIsLoading(false);
          if (e instanceof AbortError) {
            notifications.toasts.addWarning({
              title: e.message,
            });
          } else {
            notifications.toasts.addDanger({
              title: 'Failed to run search',
              text: e.message,
            });
          }
        },
      });
  };

  const onClientSideSessionCacheClickHandler = () => {
    doAsyncSearch('myStrategy', data.search.session.getSessionId());
  };

  const onServerClickHandler = async () => {
    if (!dataView || !selectedNumericField) return;
    const abortController = new AbortController();
    setAbortController(abortController);
    setIsLoading(true);
    try {
      const res = await http.get(SERVER_SEARCH_ROUTE_PATH, {
        query: {
          index: dataView.title,
          field: selectedNumericField!.name,
        },
        signal: abortController.signal,
      });

      notifications.toasts.addSuccess(`Server returned ${JSON.stringify(res)}`);
    } catch (e) {
      if (e?.name === 'AbortError') {
        notifications.toasts.addWarning({
          title: e.message,
        });
      } else {
        notifications.toasts.addDanger({
          title: 'Failed to run search',
          text: e.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSearchSourceClickHandler = (withOtherBucket: boolean) => {
    doSearchSourceSearch(withOtherBucket);
  };

  const reqTabs: EuiTabbedContentTab[] = [
    {
      id: 'request',
      name: <EuiText data-test-subj="requestTab">Request</EuiText>,
      content: (
        <>
          <EuiSpacer />
          <EuiText size="xs">Search body sent to ES</EuiText>
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="s"
            overflowHeight={450}
            isCopyable
            data-test-subj="requestCodeBlock"
          >
            {JSON.stringify(request, null, 2)}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      id: 'response',
      name: <EuiText data-test-subj="responseTab">Response</EuiText>,
      content: (
        <>
          <EuiSpacer />
          <EuiText size="xs">
            <FormattedMessage
              id="searchExamples.timestampText"
              defaultMessage="Took: {time} ms"
              values={{ time: timeTook ?? 'Unknown' }}
            />
          </EuiText>
          <EuiProgress value={loaded} max={total} size="xs" data-test-subj="progressBar" />
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="s"
            overflowHeight={450}
            isCopyable
            data-test-subj="responseCodeBlock"
          >
            {JSON.stringify(rawResponse, null, 2)}
          </EuiCodeBlock>
        </>
      ),
    },
  ];

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="searchExamples.helloWorldText"
              defaultMessage="{name}"
              values={{ name: PLUGIN_NAME }}
            />
          </h1>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            useDefaultBehaviors={true}
            indexPatterns={dataView ? [dataView] : undefined}
          />
          <EuiFlexGrid columns={4}>
            <EuiFlexItem>
              <EuiFormLabel>Data view</EuiFormLabel>
              <IndexPatternSelect
                placeholder={i18n.translate('searchSessionExample.selectDataViewPlaceholder', {
                  defaultMessage: 'Select data view',
                })}
                indexPatternId={dataView?.id || ''}
                onChange={async (dataViewId?: string) => {
                  if (dataViewId) {
                    const newDataView = await data.dataViews.get(dataViewId);
                    setDataView(newDataView);
                  } else {
                    setDataView(undefined);
                  }
                }}
                isClearable={false}
                data-test-subj="dataViewSelector"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormLabel>Field (bucket)</EuiFormLabel>
              <EuiComboBox
                options={formatFieldsToComboBox(getAggregatableStrings(fields))}
                selectedOptions={formatFieldToComboBox(selectedBucketField)}
                singleSelection={true}
                onChange={(option) => {
                  if (option.length) {
                    const fld = dataView?.getFieldByName(option[0].label);
                    setSelectedBucketField(fld || null);
                  } else {
                    setSelectedBucketField(null);
                  }
                }}
                sortMatchesBy="startsWith"
                data-test-subj="searchBucketField"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormLabel>Numeric Field (metric)</EuiFormLabel>
              <EuiComboBox
                options={formatFieldsToComboBox(getNumeric(fields))}
                selectedOptions={formatFieldToComboBox(selectedNumericField)}
                singleSelection={true}
                onChange={(option) => {
                  if (option.length) {
                    const fld = dataView?.getFieldByName(option[0].label);
                    setSelectedNumericField(fld || null);
                  } else {
                    setSelectedNumericField(null);
                  }
                }}
                sortMatchesBy="startsWith"
                data-test-subj="searchMetricField"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormLabel>Fields to queryString</EuiFormLabel>
              <EuiComboBox
                options={formatFieldsToComboBox(fields)}
                selectedOptions={formatFieldsToComboBox(selectedFields)}
                singleSelection={false}
                onChange={(option) => {
                  const flds = option
                    .map((opt) => dataView?.getFieldByName(opt?.label))
                    .filter((f) => f);
                  setSelectedFields(flds.length ? (flds as DataViewField[]) : []);
                }}
                sortMatchesBy="startsWith"
              />
            </EuiFlexItem>
          </EuiFlexGrid>
          <EuiFlexGrid columns={2}>
            <EuiFlexItem style={{ width: '40%' }}>
              <EuiSpacer />
              <EuiTitle size="s">
                <h3>
                  Searching Elasticsearch using <EuiCode>data.search</EuiCode>
                </h3>
              </EuiTitle>
              <EuiText>
                If you want to fetch data from Elasticsearch, you can use the different services
                provided by the <EuiCode>data</EuiCode> plugin. These help you get the data view and
                search bar configuration, format them into a DSL query and send it to Elasticsearch.
                <EuiSpacer />
                <EuiButtonEmpty size="xs" onClick={onClickHandler} iconType="play">
                  <FormattedMessage
                    id="searchExamples.buttonText"
                    defaultMessage="Request from low-level client (data.search.search)."
                  />
                </EuiButtonEmpty>
                <EuiText size="xs" color="subdued" className="searchExampleStepDsc">
                  <FormattedMessage
                    id="searchExamples.buttonText"
                    defaultMessage="Metrics aggregation with raw documents in response."
                  />
                </EuiText>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => onSearchSourceClickHandler(true)}
                  iconType="play"
                  data-test-subj="searchSourceWithOther"
                >
                  <FormattedMessage
                    id="searchExamples.searchSource.buttonText"
                    defaultMessage="Request from high-level client (data.search.searchSource)"
                  />
                </EuiButtonEmpty>
                <EuiText size="xs" color="subdued" className="searchExampleStepDsc">
                  <FormattedMessage
                    id="searchExamples.buttonText"
                    defaultMessage="Bucket and metrics aggregations with other bucket."
                  />
                </EuiText>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => onSearchSourceClickHandler(false)}
                  iconType="play"
                  data-test-subj="searchSourceWithoutOther"
                >
                  <FormattedMessage
                    id="searchExamples.searchSource.buttonText"
                    defaultMessage="Request from high-level client (data.search.searchSource)"
                  />
                </EuiButtonEmpty>
                <EuiText size="xs" color="subdued" className="searchExampleStepDsc">
                  <FormattedMessage
                    id="searchExamples.buttonText"
                    defaultMessage="Bucket and metrics aggregations without other bucket."
                  />
                </EuiText>
              </EuiText>
              <EuiSpacer />
              <EuiTitle size="xs">
                <h3>Handling errors & warnings</h3>
              </EuiTitle>
              <EuiText>
                When fetching data from Elasticsearch, there are several different ways warnings and
                errors may be returned. In general, it is recommended to surface these in the UX.
                <EuiSpacer />
                <EuiButtonEmpty
                  size="xs"
                  onClick={onWarningSearchClickHandler}
                  iconType="play"
                  data-test-subj="searchWithWarning"
                >
                  <FormattedMessage
                    id="searchExamples.searchWithWarningButtonText"
                    defaultMessage="Request with a warning in response"
                  />
                </EuiButtonEmpty>
                <EuiText />
                <EuiButtonEmpty
                  size="xs"
                  onClick={onErrorSearchClickHandler}
                  iconType="play"
                  data-test-subj="searchWithError"
                >
                  <FormattedMessage
                    id="searchExamples.searchWithErrorButtonText"
                    defaultMessage="Request with an error in response"
                  />
                </EuiButtonEmpty>
              </EuiText>
              <EuiSpacer />
              <EuiTitle size="xs">
                <h3>Handling partial results</h3>
              </EuiTitle>
              <EuiText>
                The observable returned from <EuiCode>data.search</EuiCode> provides partial results
                when the response is not yet complete. These can be handled to update a chart or
                simply a progress bar:
                <EuiSpacer />
                <EuiCodeBlock language="html" fontSize="s" paddingSize="s" overflowHeight={450}>
                  &lt;EuiProgress value=&#123;response.loaded&#125; max=&#123;response.total&#125;
                  /&gt;
                </EuiCodeBlock>
                Below is an example showing a custom search strategy that emits partial Fibonacci
                sequences up to the length provided, updates the response with each partial result,
                and updates a progress bar (see the Response tab).
                <EuiFieldNumber
                  id="FibonacciN"
                  placeholder="Number of Fibonacci numbers to generate"
                  value={fibonacciN}
                  onChange={(event) => setFibonacciN(parseInt(event.target.value, 10))}
                />
                <EuiButtonEmpty
                  size="xs"
                  onClick={onPartialResultsClickHandler}
                  iconType="play"
                  data-test-subj="requestFibonacci"
                >
                  Request Fibonacci sequence
                </EuiButtonEmpty>
              </EuiText>
              <EuiSpacer />
              <EuiTitle size="s">
                <h3>Writing a custom search strategy</h3>
              </EuiTitle>
              <EuiText>
                If you want to do some pre or post processing on the server, you might want to
                create a custom search strategy. This example uses such a strategy, passing in
                custom input and receiving custom output back.
                <EuiSpacer />
                <EuiCheckbox
                  id="GetCool"
                  label={
                    <FormattedMessage
                      id="searchExamples.getCoolCheckbox"
                      defaultMessage="Get cool parameter?"
                    />
                  }
                  checked={getCool}
                  onChange={(event) => setGetCool(event.target.checked)}
                />
                <EuiButtonEmpty size="xs" onClick={onMyStrategyClickHandler} iconType="play">
                  <FormattedMessage
                    id="searchExamples.myStrategyButtonText"
                    defaultMessage="Request from low-level client via My Strategy"
                  />
                </EuiButtonEmpty>
              </EuiText>
              <EuiSpacer />
              <EuiTitle size="s">
                <h3>Client side search session caching</h3>
              </EuiTitle>
              <EuiText>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => data.search.session.start()}
                  iconType="alert"
                  data-test-subj="searchExamplesStartSession"
                >
                  <FormattedMessage
                    id="searchExamples.startNewSession"
                    defaultMessage="Start a new session"
                  />
                </EuiButtonEmpty>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => data.search.session.clear()}
                  iconType="alert"
                  data-test-subj="searchExamplesClearSession"
                >
                  <FormattedMessage
                    id="searchExamples.clearSession"
                    defaultMessage="Clear session"
                  />
                </EuiButtonEmpty>
                <EuiButtonEmpty
                  size="xs"
                  onClick={onClientSideSessionCacheClickHandler}
                  iconType="play"
                  data-test-subj="searchExamplesCacheSearch"
                >
                  <FormattedMessage
                    id="searchExamples.myStrategyButtonText"
                    defaultMessage="Request from low-level client via My Strategy"
                  />
                </EuiButtonEmpty>
              </EuiText>
              <EuiSpacer />
              <EuiTitle size="s">
                <h3>Using search on the server</h3>
              </EuiTitle>
              <EuiText>
                You can also run your search request from the server, without registering a search
                strategy. This request does not take the configuration of{' '}
                <EuiCode>TopNavMenu</EuiCode> into account, but you could pass those down to the
                server as well.
                <br />
                When executing search on the server, make sure to cancel the search in case user
                cancels corresponding network request. This could happen in case user re-runs a
                query or leaves the page without waiting for the result. Cancellation API is similar
                on client and server and use `AbortController`.
                <EuiSpacer />
                <EuiButtonEmpty size="xs" onClick={onServerClickHandler} iconType="play">
                  <FormattedMessage
                    id="searchExamples.myServerButtonText"
                    defaultMessage="Request from low-level client on the server"
                  />
                </EuiButtonEmpty>
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem style={{ width: '60%' }}>
              <EuiTabbedContent
                tabs={reqTabs}
                selectedTab={reqTabs[selectedTab]}
                onTabClick={(tab) => setSelectedTab(reqTabs.indexOf(tab))}
              />
              <EuiSpacer />
              {currentAbortController && isLoading && (
                <EuiButtonEmpty size="xs" onClick={() => currentAbortController?.abort()}>
                  <FormattedMessage
                    id="searchExamples.abortButtonText"
                    defaultMessage="Abort request"
                  />
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
