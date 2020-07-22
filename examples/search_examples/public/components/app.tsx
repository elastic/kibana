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
} from '@elastic/eui';

import { CoreStart } from '../../../../src/core/public';
import { getEsQueryConfig, buildEsQuery } from '../../../../src/plugins/data/common';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

import { PLUGIN_ID, PLUGIN_NAME, IMyStrategyResponse } from '../../common';

import {
  DataPublicPluginStart,
  IndexPatternSelect,
  IEsSearchResponse,
  IndexPattern,
  QueryState,
} from '../../../../src/plugins/data/public';

interface SearchExamplesAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  uiSettings: CoreStart['uiSettings'];
  savedObjectsClient: CoreStart['savedObjects']['client'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
}

export const SearchExamplesApp = ({
  basename,
  notifications,
  uiSettings,
  savedObjectsClient,
  navigation,
  data,
}: SearchExamplesAppDeps) => {
  const [result, setResult] = useState<IEsSearchResponse | undefined>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern | null>();
  const [queryState, setQueryState] = useState<QueryState | null>();

  data.query.state$.subscribe(({ changes, state }) => {
    setQueryState(state);
  });

  useEffect(() => {
    const setDefaultIndexPattern = async () => {
      const defaultIndexPattern = await data.indexPatterns.getDefault();
      setIndexPattern(defaultIndexPattern);
    };

    setDefaultIndexPattern();
  }, [data]);

  const doAsyncSearch = async (strategy?: string) => {
    if (!indexPattern) return;

    // TODO:This should be coming from state
    const timeFilter = data.query.timefilter.timefilter.createFilter(indexPattern);
    const filters = [...(queryState?.filters || []), ...(timeFilter ? [timeFilter] : [])];

    const esQueryConfigs = getEsQueryConfig(uiSettings);
    const esQuery = buildEsQuery(
      indexPattern,
      queryState?.queryString || [],
      filters,
      esQueryConfigs
    );

    const request = {
      params: {
        index: indexPattern.title,
        body: {
          aggs: {
            avg_bytes: { avg: { field: 'bytes' } },
          },
          query: esQuery,
        },
      },
    };
    const search$ = data.search.search(request, {
      strategy,
    });
    search$.subscribe((response) => {
      if (!response.isPartial && !response.isRunning) {
        setResult(response);
        notifications.toasts.addSuccess(
          `Searched ${response.rawResponse.hits.total} documents. Result is ${
            response.rawResponse.aggregations?.avg_bytes.value
          }. Is this Cool? ${(response as IMyStrategyResponse).cool}`
        );
      }
    });
  };

  const onClickHandler = () => {
    doAsyncSearch();
  };

  const onMyStrategyClickHandler = () => {
    doAsyncSearch('myStrategy');
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
                    </EuiFlexGrid>
                  </EuiText>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="searchExamples.timestampText"
                        defaultMessage="Last query took: {time} ms"
                        values={{ time: result ? result?.rawResponse.took : 'Unknown' }}
                      />
                    </p>
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage id="searchExamples.buttonText" defaultMessage="Get data" />
                    </EuiButton>
                    <EuiButton type="primary" size="s" onClick={onMyStrategyClickHandler}>
                      <FormattedMessage
                        id="searchExamples.myStrategyButtonText"
                        defaultMessage="Get data via My Strategy"
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
