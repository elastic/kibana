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

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery } from '../index';
import { getAllSavedQueries } from '../lib/saved_query_service';

interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  isDirty: boolean;
  onSave: () => void;
  onSaveAsNew: () => void;
  onLoad: (savedQuery: SavedQuery) => void;
}

export const SavedQueryManager: FunctionComponent<Props> = ({
  showSaveQuery,
  loadedSavedQuery,
  isDirty,
  onSave,
  onSaveAsNew,
  onLoad,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);

  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
      setSavedQueries(sortedAllSavedQueries);
    };
    fetchQueries();
  }, []);

  const savedQueryDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage: 'Saved queries allow you to store sets of queries, filters and time filters.',
    }
  );

  const savedQueryPopoverTitleText = i18n.translate(
    'data.search.searchBar.savedQueryPopoverTitleText',
    {
      defaultMessage: 'Saved Queries',
    }
  );

  const filterTriggerButton = (
    <EuiButtonEmpty
      iconType="arrowDown"
      iconSide="right"
      onClick={() => {
        setIsOpen(!isOpen);
      }}
    >
      #
    </EuiButtonEmpty>
  );

  const savedQueryRows = savedQueries.map(savedQuery => {
    return (
      <li key={savedQuery.id}>
        <EuiButtonEmpty
          onClick={() => {
            onLoad(savedQuery);
            setIsOpen(false);
          }}
          flush="left"
        >
          {savedQuery.attributes.title}
        </EuiButtonEmpty>
      </li>
    );
  });

  return (
    <EuiPopover
      id="savedQueryPopover"
      button={filterTriggerButton}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
      }}
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle>{savedQueryPopoverTitleText}</EuiPopoverTitle>

      <EuiFlexGroup>
        <EuiFlexItem>{savedQueryDescriptionText}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem>
          <ul>{savedQueryRows}</ul>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="rowReverse" alignItems="center">
        {showSaveQuery && (
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => {
                if (loadedSavedQuery) {
                  onSave();
                } else {
                  onSaveAsNew();
                }
              }}
            >
              {isDirty
                ? i18n.translate('data.search.searchBar.savedQueryPopoverSaveChangesButtonText', {
                    defaultMessage: 'Save changes',
                  })
                : i18n.translate('data.search.searchBar.savedQueryPopoverSaveButtonText', {
                    defaultMessage: 'Save',
                  })}
            </EuiButton>
          </EuiFlexItem>
        )}
        <EuiFlexItem />
      </EuiFlexGroup>
    </EuiPopover>
  );
};
