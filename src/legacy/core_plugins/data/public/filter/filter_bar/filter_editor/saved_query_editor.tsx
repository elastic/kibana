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

import React, { FunctionComponent, useEffect, useState, Fragment } from 'react';
import { EuiSelectable } from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { i18n } from '@kbn/i18n';
import { SavedQueryFilterParams } from '@kbn/es-query';
import { sortBy } from 'lodash';
import { SavedQuery } from '../../../search/search_bar/index';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';

interface Props {
  showSaveQuery?: boolean;
  value?: SavedQueryFilterParams; // is this an object containing a savedQuery, the esQueryConfig and the indexPattern or just the string version of the SQ name?
  savedQueryService: SavedQueryService;
  onChange: (params: SavedQueryFilterParams) => void;
}

export const SavedQueryEditorUI: FunctionComponent<Props> = ({
  showSaveQuery,
  value,
  savedQueryService,
  onChange,
}) => {
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await savedQueryService.getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
      setSavedQueries(sortedAllSavedQueries);
    };
    fetchQueries();
  }, []); // an empty array to only fetch saved queries once on rendering

  const noSavedQueriesDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryNoSavedQueriesText',
    {
      defaultMessage: 'There are no saved queries.',
    }
  );

  const savedQueryRows = () => {
    if (!savedQueries) {
      return <div>{noSavedQueriesDescriptionText}</div>;
    }
    return savedQueries.map(savedQuery => (
      <li key={savedQuery.id}>{savedQuery.attributes.title}</li>
    ));
  };
  return <ul>{savedQueryRows()}</ul>;
};
