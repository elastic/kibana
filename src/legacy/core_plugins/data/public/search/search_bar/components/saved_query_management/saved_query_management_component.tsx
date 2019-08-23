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
  EuiPagination,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect, useState, Fragment } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery } from '../../index';
import { SavedQueryService } from '../../lib/saved_query_service';
import { SavedQueryListItem } from './saved_query_list_item';

const pageCount = 50;

interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onSave: () => void;
  onSaveAsNew: () => void;
  onLoad: (savedQuery: SavedQuery) => void;
  onClearSavedQuery: () => void;
}

export const SavedQueryManagementComponent: FunctionComponent<Props> = ({
  showSaveQuery,
  loadedSavedQuery,
  onSave,
  onSaveAsNew,
  onLoad,
  onClearSavedQuery,
  savedQueryService,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await savedQueryService.getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
      setSavedQueries(sortedAllSavedQueries);
    };
    if (isOpen) {
      fetchQueries();
    }
  }, [isOpen]);

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

  const savedQueryDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage: 'Save query text and filters that you want to use again.',
    }
  );

  const noSavedQueriesDescriptionText =
    i18n.translate('data.search.searchBar.savedQueryNoSavedQueriesText', {
      defaultMessage: 'There are no saved queries.',
    }) +
    ' ' +
    savedQueryDescriptionText;

  const savedQueryPopoverTitleText = i18n.translate(
    'data.search.searchBar.savedQueryPopoverTitleText',
    {
      defaultMessage: 'Saved Queries',
    }
  );

  const onDeleteSavedQuery = async (savedQuery: SavedQuery) => {
    setSavedQueries(
      savedQueries.filter(currentSavedQuery => currentSavedQuery.id !== savedQuery.id)
    );

    if (loadedSavedQuery && loadedSavedQuery.id === savedQuery.id) {
      onClearSavedQuery();
    }

    await savedQueryService.deleteSavedQuery(savedQuery.id);
  };

  const savedQueryPopoverButton = (
    <EuiButtonEmpty
      className="euiFormControlLayout__prepend"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => {
        setIsOpen(!isOpen);
      }}
      aria-label={i18n.translate('data.search.searchBar.savedQueryPopoverButtonText', {
        defaultMessage: 'See saved queries',
      })}
      data-test-subj="saved-query-management-popover-button"
    >
      #
    </EuiButtonEmpty>
  );

  const savedQueryRows = () => {
    // we should be recalculating the savedQueryRows after a delete action
    const savedQueriesWithoutCurrent = savedQueries.filter(savedQuery => {
      if (!loadedSavedQuery) return true;
      return savedQuery.id !== loadedSavedQuery.id;
    });
    const savedQueriesReordered =
      loadedSavedQuery && savedQueriesWithoutCurrent.length !== savedQueries.length
        ? [loadedSavedQuery, ...savedQueriesWithoutCurrent]
        : [...savedQueriesWithoutCurrent];
    const savedQueriesDisplayRows = savedQueriesReordered.slice(
      activePage * pageCount,
      activePage * pageCount + pageCount
    );
    return savedQueriesDisplayRows.map(savedQuery => (
      <SavedQueryListItem
        key={savedQuery.id}
        savedQuery={savedQuery}
        isSelected={!!loadedSavedQuery && loadedSavedQuery.id === savedQuery.id}
        onSelect={savedQueryToSelect => {
          onClearSavedQuery();
          onLoad(savedQueryToSelect);
          setIsOpen(false);
        }}
        onDelete={savedQueryToDelete => onDeleteSavedQuery(savedQueryToDelete)}
        showWriteOperations={!!showSaveQuery}
      />
    ));
  };

  return (
    <Fragment>
      <EuiPopover
        id="savedQueryPopover"
        button={savedQueryPopoverButton}
        isOpen={isOpen}
        closePopover={() => {
          setIsOpen(false);
        }}
        anchorPosition="downLeft"
        ownFocus
      >
        <div
          className="saved-query-management-popover"
          data-test-subj="saved-query-management-popover"
        >
          <EuiPopoverTitle id={'savedQueryManagementPopoverTitle'}>
            {savedQueryPopoverTitleText}
          </EuiPopoverTitle>
          {savedQueries.length > 0 ? (
            <Fragment>
              <EuiFlexGroup wrap>
                <EuiFlexItem>
                  <EuiText>{savedQueryDescriptionText}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem className="saved-query-list-wrapper">
                  <ul
                    className="saved-query-list"
                    aria-labelledby={'savedQueryManagementPopoverTitle'}
                  >
                    {savedQueryRows()}
                  </ul>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    pageCount={Math.ceil(savedQueries.length / pageCount)}
                    activePage={activePage}
                    onPageClick={goToPage}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          ) : (
            <EuiText grow={false}>{noSavedQueriesDescriptionText}</EuiText>
          )}
          <EuiFlexGroup direction="rowReverse" alignItems="center" justifyContent="flexEnd">
            {showSaveQuery && loadedSavedQuery && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => onSaveAsNew()}
                      aria-label={i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel',
                        {
                          defaultMessage: 'Save as a new saved query',
                        }
                      )}
                      data-test-subj="saved-query-management-save-as-new-button"
                    >
                      {i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveAsNewButtonText',
                        {
                          defaultMessage: 'Save as new',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiButton
                      fill
                      onClick={() => onSave()}
                      aria-label={i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel',
                        {
                          defaultMessage: 'Save changes to {title}',
                          values: { title: loadedSavedQuery.attributes.title },
                        }
                      )}
                      data-test-subj="saved-query-management-save-changes-button"
                    >
                      {i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveChangesButtonText',
                        {
                          defaultMessage: 'Save changes',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {showSaveQuery && !loadedSavedQuery && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={() => onSave()}
                  aria-label={i18n.translate(
                    'data.search.searchBar.savedQueryPopoverSaveButtonAriaLabel',
                    { defaultMessage: 'Save a new saved query' }
                  )}
                  data-test-subj="saved-query-management-save-button"
                >
                  {i18n.translate('data.search.searchBar.savedQueryPopoverSaveButtonText', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              {loadedSavedQuery && (
                <EuiButtonEmpty
                  onClick={() => onClearSavedQuery()}
                  aria-label={i18n.translate(
                    'data.search.searchBar.savedQueryPopoverClearButtonAriaLabel',
                    { defaultMessage: 'Clear current saved query' }
                  )}
                  data-test-subj="saved-query-management-clear-button"
                >
                  {i18n.translate('data.search.searchBar.savedQueryPopoverClearButtonText', {
                    defaultMessage: 'Clear',
                  })}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPopover>
    </Fragment>
  );
};
