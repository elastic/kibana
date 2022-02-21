/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiPagination,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery, SavedQueryService } from '../..';

const perPage = 50;
interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onSave: () => void;
  onSaveAsNew: () => void;
  onLoad: (savedQuery: SavedQuery) => void;
  onClearSavedQuery: () => void;
  onClose: () => void;
  saveFormComponent: JSX.Element;
  saveAsNewFormComponent: JSX.Element;
}

interface SelectableProps {
  key?: string;
  label: string;
  value?: string;
  checked?: 'on' | 'off' | undefined;
}

export function SavedQueryManagementList({
  showSaveQuery,
  loadedSavedQuery,
  onLoad,
  onClearSavedQuery,
  savedQueryService,
  onClose,
  saveFormComponent,
  saveAsNewFormComponent,
}: Props) {
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [count, setTotalCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [renderedComponent, setRenderedComponent] = useState('list');
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
    fetchCountAndSavedQueries();
  }, [activePage, savedQueryService]);

  const handleSave = useCallback(() => {
    setRenderedComponent('saveForm');
  }, []);

  const handleSaveAsNew = useCallback(() => {
    setRenderedComponent('saveAsNewForm');
  }, []);

  const handleSelect = useCallback(
    (savedQueryToSelect) => {
      onLoad(savedQueryToSelect);
      onClose();
    },
    [onLoad, onClose]
  );

  const handleDelete = useCallback(
    (savedQueryToDelete: string) => {
      const onDeleteSavedQuery = async (savedQueryId: string) => {
        cancelPendingListingRequest.current();
        setSavedQueries(
          savedQueries.filter((currentSavedQuery) => currentSavedQuery.id !== savedQueryId)
        );

        if (loadedSavedQuery && loadedSavedQuery.id === savedQueryId) {
          onClearSavedQuery();
        }

        await savedQueryService.deleteSavedQuery(savedQueryId);
        setActivePage(0);
      };

      onDeleteSavedQuery(savedQueryToDelete);
    },
    [loadedSavedQuery, onClearSavedQuery, savedQueries, savedQueryService]
  );

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

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

  const savedQueriesOptions = () => {
    const savedQueriesWithoutCurrent = savedQueries.filter((savedQuery) => {
      if (!loadedSavedQuery) return true;
      return savedQuery.id !== loadedSavedQuery.id;
    });
    const savedQueriesReordered =
      loadedSavedQuery && savedQueriesWithoutCurrent.length !== savedQueries.length
        ? [loadedSavedQuery, ...savedQueriesWithoutCurrent]
        : [...savedQueriesWithoutCurrent];
    return savedQueriesReordered.map((savedQuery) => ({
      key: savedQuery.id,
      label: savedQuery.attributes.title,
      value: savedQuery.id,
      checked: !!loadedSavedQuery && savedQuery.id === loadedSavedQuery.id ? 'on' : undefined,
      append: <EuiIcon type="trash" onClick={() => handleDelete(savedQuery.id)} />,
    })) as unknown as SelectableProps[];
  };

  const listComponent = (
    <>
      {savedQueries.length > 0 ? (
        <>
          <EuiText size="s" color="subdued" className="kbnSavedQueryManagement__text">
            <p>{savedQueryDescriptionText}</p>
          </EuiText>
          <div className="kbnSavedQueryManagement__listWrapper">
            <EuiSelectable<SelectableProps>
              aria-label="Basic example"
              options={savedQueriesOptions()}
              searchable
              singleSelection="always"
              onChange={(choices) => {
                const choice = choices.find(({ checked }) => checked) as unknown as {
                  value: string;
                };
                if (choice) {
                  handleSelect(savedQueries.find((savedQuery) => savedQuery.id === choice.value));
                }
              }}
              searchProps={{
                compressed: true,
                placeholder: i18n.translate('data.query.queryBar.indexPattern.findFilterSet', {
                  defaultMessage: 'Find a filter set',
                }),
              }}
            >
              {(list, search) => (
                <EuiPanel color="transparent" paddingSize="s">
                  {search}
                  {list}
                </EuiPanel>
              )}
            </EuiSelectable>
          </div>
          <EuiPagination
            className="kbnSavedQueryManagement__pagination"
            pageCount={Math.ceil(count / perPage)}
            activePage={activePage}
            onPageClick={goToPage}
          />
        </>
      ) : (
        <>
          <EuiText size="s" color="subdued" className="kbnSavedQueryManagement__text">
            <p>{noSavedQueriesDescriptionText}</p>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup
        direction="rowReverse"
        gutterSize="s"
        alignItems="center"
        justifyContent="flexEnd"
        responsive={false}
        wrap={false}
      >
        {showSaveQuery && loadedSavedQuery && (
          <>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                onClick={handleSave}
                aria-label={i18n.translate(
                  'data.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel',
                  {
                    defaultMessage: 'Save changes to {title}',
                    values: { title: loadedSavedQuery.attributes.title },
                  }
                )}
                data-test-subj="saved-query-management-save-changes-button"
              >
                {i18n.translate('data.search.searchBar.savedQueryPopoverSaveChangesButtonText', {
                  defaultMessage: 'Save changes',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={handleSaveAsNew}
                aria-label={i18n.translate(
                  'data.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel',
                  {
                    defaultMessage: 'Save as new saved query',
                  }
                )}
                data-test-subj="saved-query-management-save-as-new-button"
              >
                {i18n.translate('data.search.searchBar.savedQueryPopoverSaveAsNewButtonText', {
                  defaultMessage: 'Save as new',
                })}
              </EuiButton>
            </EuiFlexItem>
          </>
        )}
        {showSaveQuery && !loadedSavedQuery && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={handleSave}
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
      </EuiFlexGroup>

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
    </>
  );

  const renderComponent = () => {
    switch (renderedComponent) {
      case 'list':
      default:
        return listComponent;
      case 'saveForm':
        return saveFormComponent;
      case 'saveAsNewForm':
        return saveAsNewFormComponent;
    }
  };

  return renderComponent();
}
