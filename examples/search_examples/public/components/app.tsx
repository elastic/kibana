/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCheckbox,
  EuiSpacer,
  EuiCode,
  EuiComboBox,
  EuiFormLabel,
} from '@elastic/eui';

import { CoreStart } from '../../../../src/core/public';
import { mountReactNode } from '../../../../src/core/public/utils';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import {
  PLUGIN_ID,
  PLUGIN_NAME,
  IMyStrategyResponse,
  SERVER_SEARCH_ROUTE_PATH,
} from '../../common';

import {
  DataPublicPluginStart,
  IndexPattern,
  IndexPatternField,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../src/plugins/data/public';

interface SearchExamplesAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  savedObjectsClient: CoreStart['savedObjects']['client'];
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

export const SearchExamplesApp = ({
  http,
  basename,
  notifications,
  savedObjectsClient,
  navigation,
  data,
}: SearchExamplesAppDeps) => {
  const { IndexPatternSelect } = data.ui;
  const [getCool, setGetCool] = useState<boolean>(false);
  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | null>();
  const [fields, setFields] = useState<IndexPatternField[]>();
  const [selectedFields, setSelectedFields] = useState<IndexPatternField[]>([]);
  const [selectedNumericField, setSelectedNumericField] = useState<
    IndexPatternField | null | undefined
  >();
  const [request, setRequest] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<Record<string, any>>({});

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

  const doAsyncSearch = async (strategy?: string) => {
    if (!indexPattern || !selectedNumericField) return;

    // Constuct the query portion of the search request
    const query = data.query.getEsQuery(indexPattern);

    // Constuct the aggregations portion of the search request by using the `data.search.aggs` service.
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
      // Add a custom request parameter to be consumed by `MyStrategy`.
      ...(strategy ? { get_cool: getCool } : {}),
    };

    // Submit the search request using the `data.search` service.
    setRequest(req.params.body);
    const searchSubscription$ = data.search
      .search(req, {
        strategy,
      })
      .subscribe({
        next: (res) => {
          if (isCompleteResponse(res)) {
            setResponse(res.rawResponse);
            setTimeTook(res.rawResponse.took);
            const avgResult: number | undefined = res.rawResponse.aggregations
              ? res.rawResponse.aggregations[1].value
              : undefined;
            const message = (
              <EuiText>
                Searched {res.rawResponse.hits.total} documents. <br />
                The average of {selectedNumericField!.name} is{' '}
                {avgResult ? Math.floor(avgResult) : 0}.
                <br />
                Is it Cool? {String((res as IMyStrategyResponse).cool)}
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

  const doSearchSourceSearch = async () => {
    if (!indexPattern) return;

    const query = data.query.queryString.getQuery();
    const filters = data.query.filterManager.getFilters();
    const timefilter = data.query.timefilter.timefilter.createFilter(indexPattern);
    if (timefilter) {
      filters.push(timefilter);
    }

    try {
      const searchSource = await data.search.searchSource.create();

      searchSource
        .setField('index', indexPattern)
        .setField('filter', filters)
        .setField('query', query)
        .setField('fields', selectedFields.length ? selectedFields.map((f) => f.name) : ['*']);

      if (selectedNumericField) {
        searchSource.setField('aggs', () => {
          return data.search.aggs
            .createAggConfigs(indexPattern, [
              { type: 'avg', params: { field: selectedNumericField.name } },
            ])
            .toDsl();
        });
      }

      setRequest(await searchSource.getSearchRequestBody());
      const res = await searchSource.fetch();
      setResponse(res);

      const message = <EuiText>Searched {res.hits.total} documents.</EuiText>;
      notifications.toasts.addSuccess({
        title: 'Query result',
        text: mountReactNode(message),
      });
    } catch (e) {
      setResponse(e.body);
      notifications.toasts.addWarning(`An error has occurred: ${e.message}`);
    }
  };

  const onClickHandler = () => {
    doAsyncSearch();
  };

  const onMyStrategyClickHandler = () => {
    doAsyncSearch('myStrategy');
  };

  const onServerClickHandler = async () => {
    if (!indexPattern || !selectedNumericField) return;
    try {
      const res = await http.get(SERVER_SEARCH_ROUTE_PATH, {
        query: {
          index: indexPattern.title,
          field: selectedNumericField!.name,
        },
      });

      notifications.toasts.addSuccess(`Server returned ${JSON.stringify(res)}`);
    } catch (e) {
      notifications.toasts.addDanger('Failed to run search');
    }
  };

  const onSearchSourceClickHandler = () => {
    doSearchSourceSearch();
  };

  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            useDefaultBehaviors={true}
            indexPatterns={indexPattern ? [indexPattern] : undefined}
          />
          <EuiPage>
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
                  <EuiFlexGrid columns={3}>
                    <EuiFlexItem style={{ width: '40%' }}>
                      <EuiText>
                        <EuiFlexGrid columns={2}>
                          <EuiFlexItem>
                            <EuiFormLabel>Index Pattern</EuiFormLabel>
                            <IndexPatternSelect
                              placeholder={i18n.translate(
                                'searchSessionExample.selectIndexPatternPlaceholder',
                                {
                                  defaultMessage: 'Select index pattern',
                                }
                              )}
                              indexPatternId={indexPattern?.id || ''}
                              onChange={async (newIndexPatternId: any) => {
                                const newIndexPattern = await data.indexPatterns.get(
                                  newIndexPatternId
                                );
                                setIndexPattern(newIndexPattern);
                              }}
                              isClearable={false}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
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
                        </EuiFlexGrid>
                        <EuiFlexGroup>
                          <EuiFlexItem>
                            <EuiFormLabel>
                              Fields to query (leave blank to include all fields)
                            </EuiFormLabel>
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
                      </EuiText>
                      <EuiSpacer />
                      <EuiTitle size="s">
                        <h3>
                          Searching Elasticsearch using <EuiCode>data.search</EuiCode>
                        </h3>
                      </EuiTitle>
                      <EuiText>
                        If you want to fetch data from Elasticsearch, you can use the different
                        services provided by the <EuiCode>data</EuiCode> plugin. These help you get
                        the index pattern and search bar configuration, format them into a DSL query
                        and send it to Elasticsearch.
                        <EuiSpacer />
                        <EuiButtonEmpty size="xs" onClick={onClickHandler} iconType="play">
                          <FormattedMessage
                            id="searchExamples.buttonText"
                            defaultMessage="Request from low-level client (data.search.search)"
                          />
                        </EuiButtonEmpty>
                        <EuiButtonEmpty
                          size="xs"
                          onClick={onSearchSourceClickHandler}
                          iconType="play"
                        >
                          <FormattedMessage
                            id="searchExamples.searchSource.buttonText"
                            defaultMessage="Request from high-level client (data.search.searchSource)"
                          />
                        </EuiButtonEmpty>
                      </EuiText>
                      <EuiSpacer />
                      <EuiTitle size="s">
                        <h3>Writing a custom search strategy</h3>
                      </EuiTitle>
                      <EuiText>
                        If you want to do some pre or post processing on the server, you might want
                        to create a custom search strategy. This example uses such a strategy,
                        passing in custom input and receiving custom output back.
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
                        <EuiButtonEmpty
                          size="xs"
                          onClick={onMyStrategyClickHandler}
                          iconType="play"
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
                        You can also run your search request from the server, without registering a
                        search strategy. This request does not take the configuration of{' '}
                        <EuiCode>TopNavMenu</EuiCode> into account, but you could pass those down to
                        the server as well.
                        <EuiSpacer />
                        <EuiButtonEmpty size="xs" onClick={onServerClickHandler} iconType="play">
                          <FormattedMessage
                            id="searchExamples.myServerButtonText"
                            defaultMessage="Request from low-level client on the server"
                          />
                        </EuiButtonEmpty>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem style={{ width: '30%' }}>
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
                    <EuiFlexItem style={{ width: '30%' }}>
                      <EuiTitle size="xs">
                        <h4>Response</h4>
                      </EuiTitle>
                      <EuiText size="xs">
                        <FormattedMessage
                          id="searchExamples.timestampText"
                          defaultMessage="Took: {time} ms"
                          values={{ time: timeTook || 'Unknown' }}
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
                  </EuiFlexGrid>
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};
