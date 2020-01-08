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
  EuiPopoverFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPagination,
  EuiText,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect, useState, Fragment } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery, SavedQueryService } from '../..';
import { SavedQueryListItem } from './saved_query_list_item';

const perPage = 50;
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
  const [count, setTotalCount] = useState(0);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const fetchCountAndSavedQueries = async () => {
      const savedQueryCount = await savedQueryService.getSavedQueryCount();
      setTotalCount(savedQueryCount);

      const savedQueryItems = await savedQueryService.findSavedQueries('', perPage, activePage + 1);
      const sortedSavedQueryItems = sortBy(savedQueryItems, 'attributes.title');
      setSavedQueries(sortedSavedQueryItems);
    };
    if (isOpen) {
      fetchCountAndSavedQueries();
    }
  }, [isOpen, activePage, savedQueryService]);

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
      onClick={() => {
        setIsOpen(!isOpen);
      }}
      aria-label={i18n.translate('data.search.searchBar.savedQueryPopoverButtonText', {
        defaultMessage: 'See saved queries',
      })}
      title={i18n.translate('data.search.searchBar.savedQueryPopoverButtonText', {
        defaultMessage: 'See saved queries',
      })}
      data-test-subj="saved-query-management-popover-button"
    >
      <EuiIcon type="save" className="euiQuickSelectPopover__buttonText" />
      <EuiIcon type="arrowDown" />
    </EuiButtonEmpty>
  );

  const savedQueryRows = () => {
    const savedQueriesWithoutCurrent = savedQueries.filter(savedQuery => {
      if (!loadedSavedQuery) return true;
      return savedQuery.id !== loadedSavedQuery.id;
    });
    const savedQueriesReordered =
      loadedSavedQuery && savedQueriesWithoutCurrent.length !== savedQueries.length
        ? [loadedSavedQuery, ...savedQueriesWithoutCurrent]
        : [...savedQueriesWithoutCurrent];
    return savedQueriesReordered.map(savedQuery => (
      <SavedQueryListItem
        key={savedQuery.id}
        savedQuery={savedQuery}
        isSelected={!!loadedSavedQuery && loadedSavedQuery.id === savedQuery.id}
        onSelect={savedQueryToSelect => {
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
        panelPaddingSize="none"
        ownFocus
      >
        <div
          className="kbnSavedQueryManagement__popover"
          data-test-subj="saved-query-management-popover"
        >
          <EuiPopoverTitle id={'savedQueryManagementPopoverTitle'}>
            {savedQueryPopoverTitleText}
          </EuiPopoverTitle>
          {savedQueries.length > 0 ? (
            <Fragment>
              <EuiText size="s" color="subdued" className="kbnSavedQueryManagement__text">
                <p>{savedQueryDescriptionText}</p>
              </EuiText>
              <div className="kbnSavedQueryManagement__listWrapper">
                <EuiListGroup
                  flush={true}
                  className="kbnSavedQueryManagement__list"
                  aria-labelledby={'savedQueryManagementPopoverTitle'}
                >
                  {savedQueryRows()}
                </EuiListGroup>
              </div>
              <EuiPagination
                className="kbnSavedQueryManagement__pagination"
                pageCount={Math.ceil(count / perPage)}
                activePage={activePage}
                onPageClick={goToPage}
              />
            </Fragment>
          ) : (
            <Fragment>
              <EuiText size="s" color="subdued" className="kbnSavedQueryManagement__text">
                <p>{noSavedQueriesDescriptionText}</p>
              </EuiText>
              <EuiSpacer size="s" />
            </Fragment>
          )}
          <EuiPopoverFooter>
            <EuiFlexGroup
              direction="rowReverse"
              gutterSize="s"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
              wrap={true}
            >
              {showSaveQuery && loadedSavedQuery && (
                <Fragment>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
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
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      onClick={() => onSaveAsNew()}
                      aria-label={i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel',
                        {
                          defaultMessage: 'Save as new saved query',
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
                </Fragment>
              )}
              {showSaveQuery && !loadedSavedQuery && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    onClick={() => onSave()}
                    aria-label={i18n.translate(
                      'data.search.searchBar.savedQueryPopoverSaveButtonAriaLabel',
                      { defaultMessage: 'Save a new saved query' }
                    )}
                    data-test-subj="saved-query-management-save-button"
                  >
                    {i18n.translate('data.search.searchBar.savedQueryPopoverSaveButtonText', {
                      defaultMessage: 'Save current query',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                {loadedSavedQuery && (
                  <EuiButtonEmpty
                    size="s"
                    flush="left"
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
          </EuiPopoverFooter>
        </div>
      </EuiPopover>
    </Fragment>
  );
};
