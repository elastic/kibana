/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { sortBy } from 'lodash';
import { SavedQuery, SavedQueryService } from '../..';

interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onLoad: (savedQuery: SavedQuery) => void;
  onClearSavedQuery: () => void;
  onClose: () => void;
  hasFiltersOrQuery: boolean;
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
  hasFiltersOrQuery,
}: Props) {
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [selectedSavedQuery, setSelectedSavedQuery] = useState(null as SavedQuery | null);
  const cancelPendingListingRequest = useRef<() => void>(() => {});

  useEffect(() => {
    const fetchCountAndSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { queries: savedQueryItems } = await savedQueryService.findSavedQueries();

      if (requestGotCancelled) return;

      const sortedSavedQueryItems = sortBy(savedQueryItems, 'attributes.title');
      setSavedQueries(sortedSavedQueryItems);
    };
    fetchCountAndSavedQueries();
  }, [savedQueryService]);

  const handleLoad = useCallback(() => {
    if (selectedSavedQuery) {
      onLoad(selectedSavedQuery);
      onClose();
    }
  }, [onLoad, selectedSavedQuery, onClose]);

  const handleSelect = useCallback((savedQueryToSelect) => {
    setSelectedSavedQuery(savedQueryToSelect);
  }, []);

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
              listProps={{
                rowHeight: 40,
                isVirtualized: true,
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
        direction="row"
        gutterSize="s"
        alignItems="center"
        justifyContent="flexEnd"
        responsive={false}
        wrap={false}
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={handleLoad}
            disabled={!selectedSavedQuery}
            aria-label={i18n.translate(
              'data.search.searchBar.savedQueryPopoverApplyFilterSetLabel',
              {
                defaultMessage: 'Apply filter set',
              }
            )}
            data-test-subj="saved-query-management-apply-changes-button"
          >
            {hasFiltersOrQuery
              ? i18n.translate('data.search.searchBar.savedQueryPopoverApplyFilterSetLabel', {
                  defaultMessage: 'Replace with selected filter set',
                })
              : i18n.translate('data.search.searchBar.savedQueryPopoverApplyFilterSetLabel', {
                  defaultMessage: 'Apply filter set',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  return listComponent;
}
