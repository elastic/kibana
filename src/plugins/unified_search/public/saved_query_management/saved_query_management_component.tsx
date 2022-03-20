/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import React, { useCallback, useEffect, useState, Fragment, useRef } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery, SavedQueryService } from '../../../data/public';
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

export function SavedQueryManagementComponent({
  showSaveQuery,
  loadedSavedQuery,
  onSave,
  onSaveAsNew,
  onLoad,
  onClearSavedQuery,
  savedQueryService,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [count, setTotalCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const cancelPendingListingRequest = useRef<() => void>(() => {});

  useEffect(() => {
    const fetchCountAndSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { total: savedQueryCount, queries: savedQueryItems } =
        await savedQueryService.findSavedQueries('', perPage, activePage + 1);

      if (requestGotCancelled) return;

      const sortedSavedQueryItems = sortBy(savedQueryItems, 'attributes.title');
      setTotalCount(savedQueryCount);
      setSavedQueries(sortedSavedQueryItems);
    };
    if (isOpen) {
      fetchCountAndSavedQueries();
    }
  }, [isOpen, activePage, savedQueryService]);

  const handleTogglePopover = useCallback(
    () => setIsOpen((currentState) => !currentState),
    [setIsOpen]
  );

  const handleClosePopover = useCallback(() => setIsOpen(false), []);

  const handleSave = useCallback(() => {
    handleClosePopover();
    onSave();
  }, [handleClosePopover, onSave]);

  const handleSaveAsNew = useCallback(() => {
    handleClosePopover();
    onSaveAsNew();
  }, [handleClosePopover, onSaveAsNew]);

  const handleSelect = useCallback(
    (savedQueryToSelect) => {
      handleClosePopover();
      onLoad(savedQueryToSelect);
    },
    [handleClosePopover, onLoad]
  );

  const handleDelete = useCallback(
    (savedQueryToDelete: SavedQuery) => {
      const onDeleteSavedQuery = async (savedQuery: SavedQuery) => {
        cancelPendingListingRequest.current();
        setSavedQueries(
          savedQueries.filter((currentSavedQuery) => currentSavedQuery.id !== savedQuery.id)
        );

        if (loadedSavedQuery && loadedSavedQuery.id === savedQuery.id) {
          onClearSavedQuery();
        }

        await savedQueryService.deleteSavedQuery(savedQuery.id);
        setActivePage(0);
      };

      onDeleteSavedQuery(savedQueryToDelete);
      handleClosePopover();
    },
    [handleClosePopover, loadedSavedQuery, onClearSavedQuery, savedQueries, savedQueryService]
  );

  const savedQueryDescriptionText = i18n.translate(
    'unifiedSearch.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage: 'Save query text and filters that you want to use again.',
    }
  );

  const noSavedQueriesDescriptionText =
    i18n.translate('unifiedSearch.search.searchBar.savedQueryNoSavedQueriesText', {
      defaultMessage: 'There are no saved queries.',
    }) +
    ' ' +
    savedQueryDescriptionText;

  const savedQueryPopoverTitleText = i18n.translate(
    'unifiedSearch.search.searchBar.savedQueryPopoverTitleText',
    {
      defaultMessage: 'Saved Queries',
    }
  );

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

  const savedQueryPopoverButton = (
    <EuiButtonEmpty
      onClick={handleTogglePopover}
      aria-label={i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverButtonText', {
        defaultMessage: 'See saved queries',
      })}
      title={i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverButtonText', {
        defaultMessage: 'See saved queries',
      })}
      data-test-subj="saved-query-management-popover-button"
    >
      <EuiIcon type="save" className="euiQuickSelectPopover__buttonText" />
      <EuiIcon type="arrowDown" />
    </EuiButtonEmpty>
  );

  const savedQueryRows = () => {
    const savedQueriesWithoutCurrent = savedQueries.filter((savedQuery) => {
      if (!loadedSavedQuery) return true;
      return savedQuery.id !== loadedSavedQuery.id;
    });
    const savedQueriesReordered =
      loadedSavedQuery && savedQueriesWithoutCurrent.length !== savedQueries.length
        ? [loadedSavedQuery, ...savedQueriesWithoutCurrent]
        : [...savedQueriesWithoutCurrent];
    return savedQueriesReordered.map((savedQuery) => (
      <SavedQueryListItem
        key={savedQuery.id}
        savedQuery={savedQuery}
        isSelected={!!loadedSavedQuery && loadedSavedQuery.id === savedQuery.id}
        onSelect={handleSelect}
        onDelete={handleDelete}
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
        closePopover={handleClosePopover}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        buffer={-8}
        repositionOnScroll
        ownFocus={true}
      >
        <div
          className="kbnSavedQueryManagement__popover"
          data-test-subj="saved-query-management-popover"
        >
          <EuiPopoverTitle paddingSize="m" id={'savedQueryManagementPopoverTitle'}>
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
          <EuiPopoverFooter paddingSize="m">
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
                      onClick={handleSave}
                      aria-label={i18n.translate(
                        'unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel',
                        {
                          defaultMessage: 'Save changes to {title}',
                          values: { title: loadedSavedQuery.attributes.title },
                        }
                      )}
                      data-test-subj="saved-query-management-save-changes-button"
                    >
                      {i18n.translate(
                        'unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonText',
                        {
                          defaultMessage: 'Save changes',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      onClick={handleSaveAsNew}
                      aria-label={i18n.translate(
                        'unifiedSearch.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel',
                        {
                          defaultMessage: 'Save as new saved query',
                        }
                      )}
                      data-test-subj="saved-query-management-save-as-new-button"
                    >
                      {i18n.translate(
                        'unifiedSearch.search.searchBar.savedQueryPopoverSaveAsNewButtonText',
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
                    onClick={handleSave}
                    aria-label={i18n.translate(
                      'unifiedSearch.search.searchBar.savedQueryPopoverSaveButtonAriaLabel',
                      { defaultMessage: 'Save a new saved query' }
                    )}
                    data-test-subj="saved-query-management-save-button"
                  >
                    {i18n.translate(
                      'unifiedSearch.search.searchBar.savedQueryPopoverSaveButtonText',
                      {
                        defaultMessage: 'Save current query',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                {loadedSavedQuery && (
                  <EuiButtonEmpty
                    size="s"
                    flush="left"
                    onClick={onClearSavedQuery}
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
}
