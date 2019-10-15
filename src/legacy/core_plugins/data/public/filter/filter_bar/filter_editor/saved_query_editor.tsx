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

import React, { FunctionComponent, useState } from 'react';
import { SavedQuery } from '@kbn/es-query/src/filters/lib/saved_query_filter';
import { UiSettingsClientContract } from 'kibana/public';

import { EuiButtonEmpty } from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import { IndexPattern } from '../../..';

import { SearchBar } from '../../../search/search_bar/components/search_bar';
// import { start as data } from '../../../legacy';
// const { SearchBar } = data.ui;

interface Props {
  uiSettings: UiSettingsClientContract;
  currentSavedQuery?: SavedQuery[];
  indexPatterns: IndexPattern[];
  showSaveQuery: boolean;
}
export const SavedQueryEditor: FunctionComponent<Props> = ({
  uiSettings,
  currentSavedQuery,
  indexPatterns,
  showSaveQuery,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);
  const openPopover = () => setIsPopoverOpen(true);
  const onQueryChange = (item: any) => {
    return item;
  };
  return (
    <EuiPopover
      id="SavedQueryFilterPopover"
      button={
        <EuiButtonEmpty size="xs" onClick={openPopover} iconType={'plusInCircleFilled'}>
          'Add'
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightCenter"
    >
      <div className="savedQueryFilterEditor">
        <SearchBar
          appName="SavedQUeryFilterEditor"
          showFilterBar={true}
          showDatePicker={true}
          showQueryInput={true}
          query={
            currentSavedQuery && currentSavedQuery.length > 0
              ? {
                  language: currentSavedQuery[0].attributes.query.language,
                  query: currentSavedQuery[0].attributes.query.query,
                }
              : { language: uiSettings.get('search:queryLanguage'), query: '' }
          }
          onQuerySubmit={onQueryChange}
          indexPatterns={indexPatterns}
          showSaveQuery={showSaveQuery}
          savedQuery={
            currentSavedQuery && currentSavedQuery.length > 0 ? currentSavedQuery[0] : undefined
          }
        />
      </div>
    </EuiPopover>
  );
};
