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
  EuiConfirmModal,
  ShortDate,
  EuiPagination,
  EuiBadge,
  EuiToolTip,
  EuiText,
  EuiHorizontalRule,
  EuiProgress,
  PrettyDuration,
} from '@elastic/eui';
import { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useRef, useEffect, useMemo, RefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SavedQuery, SavedQueryService } from '@kbn/data-plugin/public';
import type { SavedQueryAttributes } from '@kbn/data-plugin/common';
import './saved_query_management_list.scss';
import { euiThemeVars } from '@kbn/ui-theme';
import { debounce } from 'lodash';
import useLatest from 'react-use/lib/useLatest';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { IUnifiedSearchPluginServices } from '../types';
import { strings as queryBarMenuPanelsStrings } from '../query_string_input/query_bar_menu_panels';
import { PanelTitle } from '../query_string_input/panel_title';

export interface SavedQueryManagementListProps {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  queryBarMenuRef: RefObject<EuiContextMenuClass>;
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
  {
    start: 'now/d',
    end: 'now/d',
    label: i18n.translate('unifiedSearch.search.searchBar.savedQueryTodayLabel', {
      defaultMessage: 'Today',
    }),
  },
  {
    start: 'now/w',
    end: 'now/w',
    label: i18n.translate('unifiedSearch.search.searchBar.savedQueryWeekLabel', {
      defaultMessage: 'This week',
    }),
  },
  {
    start: 'now/M',
    end: 'now/M',
    label: i18n.translate('unifiedSearch.search.searchBar.savedQueryMonthLabel', {
      defaultMessage: 'This month',
    }),
  },
  {
    start: 'now/y',
    end: 'now/y',
    label: i18n.translate('unifiedSearch.search.searchBar.savedQueryYearLabel', {
      defaultMessage: 'This year',
    }),
  },
  {
    start: 'now-1d/d',
    end: 'now-1d/d',
    label: i18n.translate('unifiedSearch.searchBar.savedQueryYesterdayLabel', {
      defaultMessage: 'Yesterday',
    }),
  },
  {
    start: 'now/w',
    end: 'now',
    label: i18n.translate('unifiedSearch.searchBar.savedQueryWeekToDateLabel', {
      defaultMessage: 'Week to date',
    }),
  },
  {
    start: 'now/M',
    end: 'now',
    label: i18n.translate('unifiedSearch.searchBar.savedQueryMonthToDateLabel', {
      defaultMessage: 'Month to date',
    }),
  },
  {
    start: 'now/y',
    end: 'now',
    label: i18n.translate('unifiedSearch.searchBar.savedQueryYearToDateLabel', {
      defaultMessage: 'Year to date',
    }),
  },
];

const itemTitle = (attributes: SavedQueryAttributes, services: IUnifiedSearchPluginServices) => {
  const label = [attributes.title];

  if (attributes.description) {
    label.push(attributes.description);
  }

  if (attributes.timefilter) {
    label.push(
      // This is a hack to render the PrettyDuration component to a string since itemTitle
      // is called in a loop, so the usePrettyDuration hook is not an option, and it must
      // return a string, but there is no non-hook alternative that returns a string
      renderToStaticMarkup(
        <KibanaRenderContextProvider {...services}>
          <PrettyDuration
            timeFrom={attributes.timefilter.from}
            timeTo={attributes.timefilter.to}
            quickRanges={commonDurationRanges}
            dateFormat={services.uiSettings.get('dateFormat')}
          />
        </KibanaRenderContextProvider>
      )
    );
  }

  return label.join('; ');
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

const noSavedQueriesDescriptionText = [
  i18n.translate('unifiedSearch.search.searchBar.savedQueryNoSavedQueriesText', {
    defaultMessage: 'No saved queries.',
  }),
  i18n.translate('unifiedSearch.search.searchBar.savedQueryDescriptionText', {
    defaultMessage: 'Save query text and filters that you want to use again.',
  }),
].join(' ');

const savedQueryMultipleNamespacesDeleteWarning = i18n.translate(
  'unifiedSearch.search.searchBar.savedQueryMultipleNamespacesDeleteWarning',
  {
    defaultMessage: `This saved query is shared in multiple spaces. When you delete it, you remove it from every space it is shared in. You can't undo this action.`,
  }
);

const SAVED_QUERY_PAGE_SIZE = 5;
const SAVED_QUERY_SEARCH_DEBOUNCE = 500;
const LOADING_INDICATOR_DELAY = 250;

export const SavedQueryManagementList = ({
  showSaveQuery,
  loadedSavedQuery,
  savedQueryService,
  queryBarMenuRef,
  onLoad,
  onClearSavedQuery,
  onClose,
}: SavedQueryManagementListProps) => {
  const services = useKibana<IUnifiedSearchPluginServices>().services;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageNumber, setCurrentPageNumber] = useState(0);
  const [totalQueryCount, setTotalQueryCount] = useState(0);
  const [currentPageQueries, setCurrentPageQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const currentPageFetchId = useRef(0);
  const selectableRef = useRef<EuiSelectable | null>(null);
  const [selectedSavedQuery, setSelectedSavedQuery] = useState(loadedSavedQuery);
  const [toBeDeletedSavedQuery, setToBeDeletedSavedQuery] = useState<SavedQuery | null>(null);
  const [showDeletionConfirmationModal, setShowDeletionConfirmationModal] = useState(false);

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

  const fetchPage = useLatest(async () => {
    const fetchIdValue = ++currentPageFetchId.current;
    const loadingTimeout = setTimeout(() => {
      setIsLoading(true);
    }, LOADING_INDICATOR_DELAY);

    try {
      const preparedSearch = searchTerm.trim();
      const { total, queries } = await savedQueryService.findSavedQueries(
        preparedSearch || undefined,
        SAVED_QUERY_PAGE_SIZE,
        currentPageNumber + 1
      );

      if (fetchIdValue !== currentPageFetchId.current) {
        return;
      }

      let filteredQueries = queries;

      if (loadedSavedQuery && !preparedSearch && currentPageNumber === 0) {
        filteredQueries = [
          loadedSavedQuery,
          ...queries.filter((savedQuery) => savedQuery.id !== loadedSavedQuery.id),
        ];
      }

      setTotalQueryCount(total);
      setCurrentPageQueries(filteredQueries);
      selectableRef.current?.scrollToItem(0);
    } finally {
      clearTimeout(loadingTimeout);

      if (fetchIdValue === currentPageFetchId.current) {
        setIsLoading(false);
        setIsInitializing(false);
      }
    }
  });

  useEffect(() => {
    fetchPage.current();
  }, [currentPageNumber, fetchPage, searchTerm]);

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
    (savedQueryToDelete: SavedQuery) => {
      const onDeleteSavedQuery = async (savedQueryId: string) => {
        setTotalQueryCount((currentTotalQueryCount) => Math.max(0, currentTotalQueryCount - 1));
        setCurrentPageQueries(
          currentPageQueries.filter((currentSavedQuery) => currentSavedQuery.id !== savedQueryId)
        );
        setSelectedSavedQuery(undefined);

        if (loadedSavedQuery && loadedSavedQuery.id === savedQueryId) {
          onClearSavedQuery();
        }

        try {
          await savedQueryService.deleteSavedQuery(savedQueryId);

          services.notifications.toasts.addSuccess(
            i18n.translate('unifiedSearch.search.searchBar.deleteQuerySuccessMessage', {
              defaultMessage: 'Query "{queryTitle}" was deleted',
              values: {
                queryTitle: savedQueryToDelete.attributes.title,
              },
            })
          );
        } catch (error) {
          services.notifications.toasts.addDanger(
            i18n.translate('unifiedSearch.search.searchBar.deleteQueryErrorMessage', {
              defaultMessage:
                'An error occured while deleting query "{queryTitle}": {errorMessage}',
              values: {
                queryTitle: savedQueryToDelete.attributes.title,
                errorMessage: error.message,
              },
            })
          );
          throw error;
        }
      };

      onDeleteSavedQuery(savedQueryToDelete.id);
    },
    [
      currentPageQueries,
      loadedSavedQuery,
      onClearSavedQuery,
      savedQueryService,
      services.notifications.toasts,
    ]
  );

  const savedQueriesOptions = useMemo(() => {
    return currentPageQueries.map<SelectableProps>((savedQuery) => {
      return {
        key: savedQuery.id,
        label: savedQuery.attributes.title,
        title: itemTitle(savedQuery.attributes, services),
        'data-test-subj': `load-saved-query-${savedQuery.attributes.title}-button`,
        value: savedQuery.id,
        checked: selectedSavedQuery && savedQuery.id === selectedSavedQuery.id ? 'on' : undefined,
        data: {
          attributes: savedQuery.attributes,
        },
      };
    });
  }, [currentPageQueries, selectedSavedQuery, services]);

  const renderOption = useCallback(
    (option: RenderOptionProps) => {
      return (
        <>
          {option.attributes ? itemLabel(option.attributes) : option.label}
          {option.value === loadedSavedQuery?.id && (
            <EuiBadge color="hollow" css={{ marginLeft: euiThemeVars.euiSizeS }}>
              {i18n.translate('unifiedSearch.search.searchBar.savedQueryActiveBadgeText', {
                defaultMessage: 'Active',
              })}
            </EuiBadge>
          )}
        </>
      );
    },
    [loadedSavedQuery?.id]
  );

  const countDisplay = useMemo(() => {
    const parts = [
      i18n.translate('unifiedSearch.search.searchBar.savedQueryTotalQueryCount', {
        defaultMessage: '{totalQueryCount, plural, one {# query} other {# queries}}',
        values: { totalQueryCount },
      }),
    ];

    if (Boolean(selectedSavedQuery)) {
      parts.push(
        i18n.translate('unifiedSearch.search.searchBar.savedQuerySelectedQueryCount', {
          defaultMessage: '1 selected',
        })
      );
    }

    return parts.join(' | ');
  }, [selectedSavedQuery, totalQueryCount]);

  return (
    <>
      <ListTitle queryBarMenuRef={queryBarMenuRef} />
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        className="kbnSavedQueryManagement__listWrapper"
        data-test-subj="saved-query-management-list"
      >
        <EuiFlexItem grow={false} css={{ position: 'relative' }}>
          {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
          <EuiSelectable<SelectableProps>
            ref={selectableRef}
            aria-label={i18n.translate('unifiedSearch.search.searchBar.savedQueryListAriaLabel', {
              defaultMessage: 'Query list',
            })}
            isLoading={isInitializing}
            singleSelection="always"
            options={savedQueriesOptions}
            listProps={{ onFocusBadge: false }}
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
              'data-test-subj': 'saved-query-management-search-input',
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
              const choice = choices.find(({ checked }) => checked);
              if (choice) {
                handleSelect(
                  currentPageQueries.find((savedQuery) => savedQuery.id === choice.value)
                );
              }
            }}
            renderOption={renderOption}
            css={{
              '.euiSelectableList__list': {
                WebkitMaskImage: 'unset',
                maskImage: 'unset',
              },
            }}
          >
            {(list, search) => (
              <>
                <EuiPanel color="transparent" paddingSize="s" css={{ paddingBottom: 0 }}>
                  {search}
                </EuiPanel>
                <EuiPanel color="transparent" paddingSize="s">
                  <EuiText size="xs" color="subdued">
                    {countDisplay}
                  </EuiText>
                </EuiPanel>
                <EuiHorizontalRule margin="none" />
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
      <EuiPopoverFooter
        paddingSize="s"
        css={{ backgroundColor: euiThemeVars.euiColorLightestShade }}
      >
        <EuiFlexGroup
          responsive={false}
          gutterSize="xs"
          alignItems="center"
          justifyContent="spaceBetween"
        >
          {Boolean(showSaveQuery) && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={
                  selectedSavedQuery
                    ? i18n.translate('unifiedSearch.search.searchBar.savedQueryDelete', {
                        defaultMessage: 'Delete query',
                      })
                    : i18n.translate('unifiedSearch.search.searchBar.savedQuerySelectionRequired', {
                        defaultMessage: 'You need to select a query first',
                      })
                }
              >
                <EuiButtonIcon
                  display="base"
                  size="s"
                  iconType="trash"
                  color="danger"
                  disabled={!selectedSavedQuery}
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
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={
                !selectedSavedQuery &&
                i18n.translate('unifiedSearch.search.searchBar.savedQuerySelectionRequired', {
                  defaultMessage: 'You need to select a query first',
                })
              }
            >
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
            </EuiToolTip>
          </EuiFlexItem>
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
            onDelete(toBeDeletedSavedQuery);
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
};

const ListTitle = ({ queryBarMenuRef }: { queryBarMenuRef: RefObject<EuiContextMenuClass> }) => {
  const { application, http } = useKibana<IUnifiedSearchPluginServices>().services;
  const canEditSavedObjects = application.capabilities.savedObjectsManagement.edit;

  return (
    <PanelTitle
      queryBarMenuRef={queryBarMenuRef}
      title={queryBarMenuPanelsStrings.getLoadCurrentFilterSetLabel()}
      append={
        canEditSavedObjects && (
          <EuiToolTip
            position="bottom"
            content={i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverManageLabel', {
              defaultMessage: 'Manage queries',
            })}
          >
            <EuiButtonIcon
              iconType="gear"
              color="text"
              href={http.basePath.prepend(
                `/app/management/kibana/objects?initialQuery=type:("query")`
              )}
              aria-label={i18n.translate(
                'unifiedSearch.search.searchBar.savedQueryPopoverManageLabel',
                {
                  defaultMessage: 'Manage queries',
                }
              )}
            />
          </EuiToolTip>
        )
      }
    />
  );
};
