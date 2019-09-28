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

import React, { Fragment, useState, useEffect } from 'react';
import { EuiSelectable, EuiLoadingContent, EuiText, EuiSpacer } from '@elastic/eui';
// Types
import { sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';
import { SavedQuery } from '../../../search/search_bar';

type OptionCheckedType = 'on' | 'off' | undefined;

export interface SavedQueryOption {
  label: string;
  checked?: OptionCheckedType;
  disabled?: boolean;
  isGroupLabel?: boolean;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  ref?: (optionIndex: number) => void;
}
interface SavedQueryPickerProps {
  savedQueryService: SavedQueryService;
  onChange: (selectedOption: SavedQueryOption[], savedQueries: SavedQuery[]) => void;
}

export function SavedQueryPicker({ savedQueryService, onChange }: SavedQueryPickerProps) {
  const [options, setOptions] = useState([] as SavedQueryOption[]);
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [savedQueriesLoaded, setSavedQueriesLoaded] = useState(false);

  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await savedQueryService.getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
      setSavedQueries(sortedAllSavedQueries);
      setSavedQueriesLoaded(true);
    };
    if (!savedQueriesLoaded) {
      fetchQueries();
      getMappedSavedQueries();
    }
  }, [options]); // I might need to be watching !savedQueriesLoaded here,

  /*
    Checked has to be a conditional depending on if a saved query is already selected as a filter.
    However, the saved query might have been changed in the mean time and the filter is a copy of
    a saved query that's created at filter creation time.
    I might need to do a deep comparison from the saved query filters that are active.
  */
  const getMappedSavedQueries = () => {
    const savedQueriesWithLabel = savedQueries
      .map(sq => {
        return {
          label: sq.id,
          checked: undefined,
        };
      })
      .map(option => {
        const { checked, ...checklessOption } = option;
        return { ...checklessOption };
      });
    setOptions(savedQueriesWithLabel);
  };
  return (
    <Fragment>
      {(!savedQueriesLoaded || !options.length) && <EuiLoadingContent lines={1} />}
      {savedQueriesLoaded && !options.length && (
        <EuiText size="s" color="subdued" className="kbnSavedQueryFilterEditor__text">
          <p>
            {i18n.translate('data.filter.filterEditor.savedQueryFilterPicker.noSavedQueriesText', {
              defaultMessage: 'There are no saved queries.',
            })}
          </p>
        </EuiText>
      )}
      {savedQueriesLoaded && options.length && (
        <Fragment>
          <EuiText size="s" color="subdued" className="kbnSavedQueryFilterEditor__text">
            <p>
              {i18n.translate(
                'data.filter.filterEditor.savedQueryFilterPicker.savedQueryFilterCopyUsageText',
                {
                  defaultMessage:
                    'Filters create a copy of a saved query. Changes will not change the filter.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiSelectable
            options={options}
            onChange={newOptions => {
              const selectedOption = newOptions.filter(option => option.checked === 'on');
              setOptions(newOptions);
              onChange(selectedOption, savedQueries);
            }}
            singleSelection={true}
            listProps={{ bordered: true }}
          >
            {list => list}
          </EuiSelectable>
        </Fragment>
      )}
    </Fragment>
  );
}
