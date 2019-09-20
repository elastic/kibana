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
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import { EuiFormRow } from '@elastic/eui';
import { GenericComboBox } from './generic_combo_box';
import { SavedQuery } from '../../../search/search_bar/index';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';

interface Props {
  showSaveQuery?: boolean;
  value?: SavedQuery; // is this an object containing a savedQuery
  savedQueryService: SavedQueryService;
  onChange: (params: SavedQuery) => void;
}
// problem with types is that the SavedQuery type used here is the one from Saved Objects. The type the filter is expecting is the one with the converted timefilter
export const SavedQueryEditorUI: FunctionComponent<Props> = ({
  showSaveQuery,
  value,
  savedQueryService,
  onChange,
}) => {
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [selectedSavedQuery, setSelectedSavedQuery] = useState((value as SavedQuery) || undefined);
  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await savedQueryService.getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
      setSavedQueries(sortedAllSavedQueries);
    };
    fetchQueries();
  }, []); // an empty array to only fetch saved queries once on rendering

  const noSavedQueriesDescriptionText = i18n.translate(
    'data.filter.filterEditor.savedQueryFilterEditor.savedQueryNoSavedQueriesText',
    {
      defaultMessage: 'There are no saved queries.',
    }
  );
  const onSavedQueryChange = (selected: any) => {
    const newSelectedSavedQuery = { ...selected[0] };
    setSelectedSavedQuery(newSelectedSavedQuery);

    onChange(selected[0]);
  };

  return (
    <EuiFormRow
      label={i18n.translate('data.filter.filterEditor.savedQueryFilterEditor.fieldSelectLabel', {
        defaultMessage: 'Saved query',
      })}
    >
      {savedQueries && savedQueries.length ? (
        <GenericComboBox
          id="savedQueryInput"
          isDisabled={!savedQueries.length}
          placeholder={i18n.translate(
            'data.filter.filterEditor.savedQueryFilterEditor.savedQerySelectPlaceholder',
            { defaultMessage: 'Select a saved query' }
          )}
          options={savedQueries}
          selectedOptions={selectedSavedQuery ? [selectedSavedQuery] : []}
          getLabel={({ id }) => id}
          onChange={onSavedQueryChange}
          singleSelection={{ asPlainText: false }}
          isClearable={false}
        />
      ) : (
        <p>{noSavedQueriesDescriptionText}</p>
      )}
    </EuiFormRow>
  );
};
