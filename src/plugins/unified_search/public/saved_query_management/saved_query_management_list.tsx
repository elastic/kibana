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
  EuiPopoverFooter,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiConfirmModal,
  usePrettyDuration,
  ShortDate,
  EuiPagination,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SavedQuery, SavedQueryService } from '@kbn/data-plugin/public';
import type { SavedQueryAttributes } from '@kbn/data-plugin/common';
import './saved_query_management_list.scss';
import { euiThemeVars } from '@kbn/ui-theme';
import { debounce } from 'lodash';
import useLatest from 'react-use/lib/useLatest';
import type { IUnifiedSearchPluginServices } from '../types';

export interface SavedQueryManagementListProps {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onLoad: (savedQuery: SavedQuery) => void;
  onClearSavedQuery: () => void;
  onClose: () => void;
}

interface SelectableProps {
  key?: string;
  label: string;
  value?: string;
  checked?: 'on' | 'off' | undefined;
}

interface RenderOptionProps extends SelectableProps {
  attributes?: SavedQueryAttributes;
}

interface DurationRange {
  end: ShortDate;
  label?: string;
  start: ShortDate;
}

const commonDurationRanges: DurationRange[] = [
  { start: 'now/d', end: 'now/d', label: 'Today' },
  { start: 'now/w', end: 'now/w', label: 'This week' },
  { start: 'now/M', end: 'now/M', label: 'This month' },
  { start: 'now/y', end: 'now/y', label: 'This year' },
  { start: 'now-1d/d', end: 'now-1d/d', label: 'Yesterday' },
  { start: 'now/w', end: 'now', label: 'Week to date' },
  { start: 'now/M', end: 'now', label: 'Month to date' },
  { start: 'now/y', end: 'now', label: 'Year to date' },
];

const itemTitle = (attributes: SavedQueryAttributes, format: string) => {
  let label = attributes.title;
  const prettifier = usePrettyDuration;

  if (attributes.description) {
    label += `; ${attributes.description}`;
  }

  if (attributes.timefilter) {
    label += `; ${prettifier({
      timeFrom: attributes.timefilter?.from,
      timeTo: attributes.timefilter?.to,
      quickRanges: commonDurationRanges,
      dateFormat: format,
    })}`;
  }

  return label;
};

const itemLabel = (attributes: SavedQueryAttributes) => {
  let label: React.ReactNode = attributes.title;

  if (attributes.description) {
    label = (
      <>
        {label} <EuiIcon type="iInCircle" color="subdued" size="s" />
      </>
    );
  }

  if (attributes.timefilter) {
    label = (
      <>
        {label} <EuiIcon type="clock" color="subdued" size="s" />
      </>
    );
  }

  return label;
};

const savedQueryDescriptionText = i18n.translate(
  'unifiedSearch.search.searchBar.savedQueryDescriptionText',
  {
    defaultMessage: 'Save query text and filters that you want to use again.',
  }
);

const noSavedQueriesDescriptionText =
  i18n.translate('unifiedSearch.search.searchBar.savedQueryNoSavedQueriesText', {
    defaultMessage: 'No saved queries.',
  }) +
  ' ' +
  savedQueryDescriptionText;

const savedQueryMultipleNamespacesDeleteWarning = i18n.translate(
  'unifiedSearch.search.searchBar.savedQueryMultipleNamespacesDeleteWarning',
  {
    defaultMessage: `This saved query is shared in multiple spaces. When you delete it, you remove it from every space it is shared in. You can't undo this action.`,
  }
);

const SAVED_QUERY_PAGE_SIZE = 20;
const SAVED_QUERY_SEARCH_DEBOUNCE = 500;

export function SavedQueryManagementList({
  showSaveQuery,
  loadedSavedQuery,
  onLoad,
  onClearSavedQuery,
  savedQueryService,
  onClose,
}: SavedQueryManagementListProps) {
  const { uiSettings, http, application } = useKibana<IUnifiedSearchPluginServices>().services;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageNumber, setCurrentPageNumber] = useState(0);
  const [totalQueryCount, setTotalQueryCount] = useState(0);
  const [currentPageQueries, setCurrentPageQueries] = useState<SavedQuery[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const currentPageFetchId = useRef(0);
  const selectableRef = useRef<EuiSelectable | null>(null);
  const latestLoadedQuery = useLatest(loadedSavedQuery);
  const [selectedSavedQuery, setSelectedSavedQuery] = useState(loadedSavedQuery);
  const [toBeDeletedSavedQuery, setToBeDeletedSavedQuery] = useState<SavedQuery | null>(null);
  const [showDeletionConfirmationModal, setShowDeletionConfirmationModal] = useState(false);
  const format = uiSettings.get('dateFormat');

  const debouncedSetSearchTerm = useMemo(() => {
    return debounce((newSearchTerm: string) => {
      setSearchTerm((currentSearchTerm) => {
        if (currentSearchTerm !== newSearchTerm) {
          setCurrentPageNumber(0);
        }

        return newSearchTerm;
      });
    }, SAVED_QUERY_SEARCH_DEBOUNCE);
  }, []);

  useEffect(() => {
    const fetchPage = async () => {
      const fetchIdValue = ++currentPageFetchId.current;

      try {
        const trimmedSearchTerm = searchTerm.trim();
        const { total, queries } = await savedQueryService.findSavedQueries(
          trimmedSearchTerm ? `${trimmedSearchTerm}*` : undefined,
          SAVED_QUERY_PAGE_SIZE,
          currentPageNumber + 1
        );

        if (fetchIdValue !== currentPageFetchId.current) {
          return;
        }

        const loadedQuery = latestLoadedQuery.current;
        const filteredQueries = queries.filter((savedQuery) => savedQuery.id !== loadedQuery?.id);

        if (loadedQuery && currentPageNumber === 0) {
          filteredQueries.unshift(loadedQuery);
        }

        setTotalQueryCount(total);
        setCurrentPageQueries(filteredQueries);
        selectableRef.current?.scrollToItem(0);
      } finally {
        if (fetchIdValue === currentPageFetchId.current) {
          setIsInitializing(false);
        }
      }
    };

    fetchPage();
  }, [currentPageNumber, latestLoadedQuery, savedQueryService, searchTerm]);

  const handleLoad = useCallback(() => {
    if (selectedSavedQuery) {
      onLoad(selectedSavedQuery);
      onClose();
    }
  }, [onLoad, selectedSavedQuery, onClose]);

  const handleSelect = useCallback((savedQueryToSelect) => {
    setSelectedSavedQuery(savedQueryToSelect);
  }, []);

  const handleDelete = useCallback((savedQueryToDelete: SavedQuery) => {
    setShowDeletionConfirmationModal(true);
    setToBeDeletedSavedQuery(savedQueryToDelete);
  }, []);

  const onDelete = useCallback(
    (savedQueryToDelete: string) => {
      const onDeleteSavedQuery = async (savedQueryId: string) => {
        setCurrentPageQueries(
          currentPageQueries.filter((currentSavedQuery) => currentSavedQuery.id !== savedQueryId)
        );

        if (loadedSavedQuery && loadedSavedQuery.id === savedQueryId) {
          onClearSavedQuery();
          setSelectedSavedQuery(undefined);
        }

        await savedQueryService.deleteSavedQuery(savedQueryId);
      };

      onDeleteSavedQuery(savedQueryToDelete);
    },
    [currentPageQueries, loadedSavedQuery, onClearSavedQuery, savedQueryService]
  );

  const savedQueriesOptions = useMemo(() => {
    return currentPageQueries.map<SelectableProps>((savedQuery) => {
      return {
        key: savedQuery.id,
        label: savedQuery.attributes.title,
        title: itemTitle(savedQuery.attributes, format),
        'data-test-subj': `load-saved-query-${savedQuery.attributes.title}-button`,
        value: savedQuery.id,
        checked: selectedSavedQuery && savedQuery.id === selectedSavedQuery.id ? 'on' : undefined,
        data: {
          attributes: savedQuery.attributes,
        },
      };
    });
  }, [currentPageQueries, format, selectedSavedQuery]);

  const renderOption = (option: RenderOptionProps) => {
    return <>{option.attributes ? itemLabel(option.attributes) : option.label}</>;
  };

  const canEditSavedObjects = application.capabilities.savedObjectsManagement.edit;

  const listComponent = (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        className="kbnSavedQueryManagement__listWrapper"
        data-test-subj="saved-query-management-list"
      >
        <EuiFlexItem grow={false}>
          <EuiSelectable<SelectableProps>
            ref={selectableRef}
            aria-label={i18n.translate('unifiedSearch.search.searchBar.savedQueryListAriaLabel', {
              defaultMessage: 'Query list',
            })}
            isLoading={isInitializing}
            singleSelection="always"
            options={savedQueriesOptions}
            listProps={{
              isVirtualized: true,
            }}
            isPreFiltered
            searchable
            searchProps={{
              compressed: true,
              placeholder: i18n.translate(
                'unifiedSearch.query.queryBar.indexPattern.findFilterSet',
                {
                  defaultMessage: 'Find a query',
                }
              ),
              onChange: debouncedSetSearchTerm,
            }}
            loadingMessage={i18n.translate(
              'unifiedSearch.search.searchBar.savedQueryLoadingQueriesText',
              {
                defaultMessage: 'Loading queries',
              }
            )}
            emptyMessage={
              <span data-test-subj="saved-query-management-empty">
                {noSavedQueriesDescriptionText}
              </span>
            }
            onChange={(choices) => {
              const choice = choices.find(({ checked }) => checked) as unknown as {
                value: string;
              };
              if (choice) {
                handleSelect(
                  currentPageQueries.find((savedQuery) => savedQuery.id === choice.value)
                );
              }
            }}
            renderOption={renderOption}
          >
            {(list, search) => (
              <>
                <EuiPanel color="transparent" paddingSize="s" css={{ paddingBottom: 0 }}>
                  {search}
                </EuiPanel>
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiFlexItem>
        {totalQueryCount > SAVED_QUERY_PAGE_SIZE && (
          <EuiFlexItem grow={false} css={{ padding: euiThemeVars.euiSizeS }}>
            <EuiFlexGroup responsive={false} justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiPagination
                  pageCount={Math.ceil(totalQueryCount / SAVED_QUERY_PAGE_SIZE)}
                  activePage={currentPageNumber}
                  onPageClick={(activePage) => setCurrentPageNumber(activePage)}
                  compressed
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
              <EuiFlexItem>
                <EuiButton
                  size="s"
                  fill
                  onClick={handleLoad}
                  disabled={!selectedSavedQuery}
                  aria-label={i18n.translate(
                    'unifiedSearch.search.searchBar.savedQueryPopoverApplyFilterSetLabel',
                    {
                      defaultMessage: 'Load query',
                    }
                  )}
                  data-test-subj="saved-query-management-apply-changes-button"
                >
                  {i18n.translate(
                    'unifiedSearch.search.searchBar.savedQueryPopoverApplyFilterSetLabel',
                    {
                      defaultMessage: 'Load query',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
              {Boolean(showSaveQuery) && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    display="base"
                    size="s"
                    iconType="trash"
                    color="danger"
                    disabled={!selectedSavedQuery}
                    title={i18n.translate('unifiedSearch.search.searchBar.savedQueryDelete', {
                      defaultMessage: 'Delete query',
                    })}
                    aria-label={i18n.translate('unifiedSearch.search.searchBar.savedQueryDelete', {
                      defaultMessage: 'Delete query',
                    })}
                    data-test-subj="delete-saved-query-button"
                    onClick={() => {
                      if (selectedSavedQuery) {
                        handleDelete(selectedSavedQuery);
                      }
                    }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {canEditSavedObjects && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={http.basePath.prepend(
                  `/app/management/kibana/objects?initialQuery=type:("query")`
                )}
                size="s"
              >
                {i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverManageLabel', {
                  defaultMessage: 'Manage saved objects',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverFooter>
      {showDeletionConfirmationModal && toBeDeletedSavedQuery && (
        <EuiConfirmModal
          title={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverConfirmDeletionTitle',
            {
              defaultMessage: 'Delete "{savedQueryName}"?',
              values: {
                savedQueryName: toBeDeletedSavedQuery.attributes.title,
              },
            }
          )}
          confirmButtonText={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverConfirmDeletionConfirmButtonText',
            {
              defaultMessage: 'Delete',
            }
          )}
          cancelButtonText={i18n.translate(
            'unifiedSearch.search.searchBar.savedQueryPopoverConfirmDeletionCancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          )}
          onConfirm={() => {
            onDelete(toBeDeletedSavedQuery.id);
            setShowDeletionConfirmationModal(false);
          }}
          buttonColor="danger"
          onCancel={() => {
            setShowDeletionConfirmationModal(false);
          }}
        >
          {toBeDeletedSavedQuery.namespaces.length > 1 ||
          toBeDeletedSavedQuery.namespaces.includes('*')
            ? savedQueryMultipleNamespacesDeleteWarning
            : null}
        </EuiConfirmModal>
      )}
    </>
  );

  return listComponent;
}
