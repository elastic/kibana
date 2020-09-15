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
  EuiButton,
  EuiPage,
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
  IndexPatternSelect,
  IndexPattern,
  IndexPatternField,
} from '../../../../src/plugins/data/public';

interface SearchExamplesAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  savedObjectsClient: CoreStart['savedObjects']['client'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
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
  const [getCool, setGetCool] = useState<boolean>(false);
  const [timeTook, setTimeTook] = useState<number | undefined>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | null>();
  const [numericFields, setNumericFields] = useState<IndexPatternField[]>();
  const [selectedField, setSelectedField] = useState<IndexPatternField | null | undefined>();

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
    const fields = indexPattern?.fields.filter(
      (field) => field.type === 'number' && field.aggregatable
    );
    setNumericFields(fields);
    setSelectedField(fields?.length ? fields[0] : null);
  }, [indexPattern]);

  const doAsyncSearch = async (strategy?: string) => {
    if (!indexPattern || !selectedField) return;

    // Constuct the query portion of the search request
    const query = data.query.getEsQuery(indexPattern);

    // Constuct the aggregations portion of the search request by using the `data.search.aggs` service.
    const aggs = [{ type: 'avg', params: { field: selectedField.name } }];
    const aggsDsl = data.search.aggs.createAggConfigs(indexPattern, aggs).toDsl();

    const request = {
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
    const searchSubscription$ = data.search
      .search(request, {
        strategy,
      })
      .subscribe({
        next: (response) => {
          if (!response.isPartial && !response.isRunning) {
            setTimeTook(response.rawResponse.took);
            const avgResult: number | undefined = response.rawResponse.aggregations
              ? response.rawResponse.aggregations[1].value
              : undefined;
            const message = (
              <EuiText>
                Searched {response.rawResponse.hits.total} documents. <br />
                The average of {selectedField.name} is {avgResult ? Math.floor(avgResult) : 0}.
                <br />
                Is it Cool? {String((response as IMyStrategyResponse).cool)}
              </EuiText>
            );
            notifications.toasts.addSuccess({
              title: 'Query result',
              text: mountReactNode(message),
            });
            searchSubscription$.unsubscribe();
          } else if (response.isPartial && !response.isRunning) {
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

  const onClickHandler = () => {
    doAsyncSearch();
  };

  const onMyStrategyClickHandler = () => {
    doAsyncSearch('myStrategy');
  };

  const onServerClickHandler = async () => {
    if (!indexPattern || !selectedField) return;
    try {
      const response = await http.get(SERVER_SEARCH_ROUTE_PATH, {
        query: {
          index: indexPattern.title,
          field: selectedField.name,
        },
      });

      notifications.toasts.addSuccess(`Server returned ${JSON.stringify(response)}`);
    } catch (e) {
      notifications.toasts.addDanger('Failed to run search');
    }
  };

  if (!indexPattern) return null;

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
          <EuiPage restrictWidth="1000px">
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
                  <EuiText>
                    <EuiFlexGrid columns={1}>
                      <EuiFlexItem>
                        <EuiFormLabel>Index Pattern</EuiFormLabel>
                        <IndexPatternSelect
                          savedObjectsClient={savedObjectsClient}
                          placeholder={i18n.translate(
                            'backgroundSessionExample.selectIndexPatternPlaceholder',
                            {
                              defaultMessage: 'Select index pattern',
                            }
                          )}
                          indexPatternId={indexPattern?.id || ''}
                          onChange={async (newIndexPatternId: any) => {
                            const newIndexPattern = await data.indexPatterns.get(newIndexPatternId);
                            setIndexPattern(newIndexPattern);
                          }}
                          isClearable={false}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFormLabel>Numeric Fields</EuiFormLabel>
                        <EuiComboBox
                          options={formatFieldsToComboBox(numericFields)}
                          selectedOptions={formatFieldToComboBox(selectedField)}
                          singleSelection={true}
                          onChange={(option) => {
                            const field = indexPattern.getFieldByName(option[0].label);
                            setSelectedField(field || null);
                          }}
                          sortMatchesBy="startsWith"
                        />
                      </EuiFlexItem>
                    </EuiFlexGrid>
                  </EuiText>
                  <EuiText>
                    <FormattedMessage
                      id="searchExamples.timestampText"
                      defaultMessage="Last query took: {time} ms"
                      values={{ time: timeTook || 'Unknown' }}
                    />
                  </EuiText>
                  <EuiSpacer />
                  <EuiTitle size="s">
                    <h3>
                      Searching Elasticsearch using <EuiCode>data.search</EuiCode>
                    </h3>
                  </EuiTitle>
                  <EuiText>
                    If you want to fetch data from Elasticsearch, you can use the different services
                    provided by the <EuiCode>data</EuiCode> plugin. These help you get the index
                    pattern and search bar configuration, format them into a DSL query and send it
                    to Elasticsearch.
                    <EuiSpacer />
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="searchExamples.buttonText" defaultMessage="Get data" />
                    </EuiButton>
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
                    <EuiButton type="primary" size="s" onClick={onMyStrategyClickHandler}>
                      <FormattedMessage
                        id="searchExamples.myStrategyButtonText"
                        defaultMessage="Get data via My Strategy"
                      />
                    </EuiButton>
                  </EuiText>
                  <EuiSpacer />
                  <EuiTitle size="s">
                    <h3>Using search on the server</h3>
                  </EuiTitle>
                  <EuiText>
                    You can also run your search request from the server, without registering a
                    search strategy. This request does not take the configuration of{' '}
                    <EuiCode>TopNavMenu</EuiCode> into account, but you could pass those down to the
                    server as well.
                    <EuiButton type="primary" size="s" onClick={onServerClickHandler}>
                      <FormattedMessage
                        id="searchExamples.myServerButtonText"
                        defaultMessage="Get data on the server"
                      />
                    </EuiButton>
                  </EuiText>
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};
