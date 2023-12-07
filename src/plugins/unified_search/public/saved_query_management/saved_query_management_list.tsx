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
  usePrettyDuration,
  ShortDate,
  EuiPagination,
  EuiBadge,
  EuiContextMenuItem,
  EuiTitle,
  useEuiTheme,
  logicalCSS,
  keys,
  EuiToolTip,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import { i18n } from '@kbn/i18n';
import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
  RefObject,
  KeyboardEvent,
} from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SavedQuery, SavedQueryService } from '@kbn/data-plugin/public';
import type { SavedQueryAttributes } from '@kbn/data-plugin/common';
import './saved_query_management_list.scss';
import { euiThemeVars } from '@kbn/ui-theme';
import { debounce } from 'lodash';
import useLatest from 'react-use/lib/useLatest';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import type { IUnifiedSearchPluginServices } from '../types';
import { strings as queryBarMenuPanelsStrings } from '../query_string_input/query_bar_menu_panels';

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

const SAVED_QUERY_PAGE_SIZE = 5;
const SAVED_QUERY_SEARCH_DEBOUNCE = 500;

export function SavedQueryManagementList({
  showSaveQuery,
  loadedSavedQuery,
  savedQueryService,
  queryBarMenuRef,
  onLoad,
  onClearSavedQuery,
  onClose,
}: SavedQueryManagementListProps) {
  const { uiSettings } = useKibana<IUnifiedSearchPluginServices>().services;
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

        let filteredQueries = queries;
        const loadedQuery = latestLoadedQuery.current;

        if (loadedQuery && !trimmedSearchTerm && currentPageNumber === 0) {
          filteredQueries = [
            loadedQuery,
            ...queries.filter((savedQuery) => savedQuery.id !== loadedQuery?.id),
          ];
        }

        if (!filteredQueries.some((savedQuery) => savedQuery.id === selectedSavedQuery?.id)) {
          setSelectedSavedQuery(undefined);
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
  }, [currentPageNumber, latestLoadedQuery, savedQueryService, searchTerm, selectedSavedQuery?.id]);

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
        setSelectedSavedQuery(undefined);

        if (loadedSavedQuery && loadedSavedQuery.id === savedQueryId) {
          onClearSavedQuery();
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
  };

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
        <EuiFlexItem grow={false}>
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
            css={{
              '.euiSelectableList__list': {
                WebkitMaskImage: 'unset',
                maskImage: 'unset',
              },
              '.euiSelectableListItem': {
                color: 'inherit !important',
                backgroundColor: 'inherit !important',
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
                    {i18n.translate('unifiedSearch.search.searchBar.savedQueryTotalQueryCount', {
                      defaultMessage: '{totalQueryCount, plural, one {# query} other {# queries}}',
                      values: { totalQueryCount },
                    })}
                    {Boolean(selectedSavedQuery) &&
                      ` | ${i18n.translate(
                        'unifiedSearch.search.searchBar.savedQuerySelectedQueryCount',
                        {
                          defaultMessage: '1 selected',
                        }
                      )}`}
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
                content={i18n.translate('unifiedSearch.search.searchBar.savedQueryDelete', {
                  defaultMessage: 'Delete query',
                })}
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
}

const ListTitle = ({ queryBarMenuRef }: { queryBarMenuRef: RefObject<EuiContextMenuClass> }) => {
  const { application, http } = useKibana<IUnifiedSearchPluginServices>().services;
  const canEditSavedObjects = application.capabilities.savedObjectsManagement.edit;
  const { euiTheme } = useEuiTheme();
  const titleRef = useRef<HTMLButtonElement | null>(null);

  const onTitleClick = useCallback(
    () => queryBarMenuRef.current?.showPreviousPanel(),
    [queryBarMenuRef]
  );

  const onTitleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== keys.ARROW_LEFT) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      queryBarMenuRef.current?.showPreviousPanel();
      queryBarMenuRef.current?.onUseKeyboardToNavigate();
    },
    [queryBarMenuRef]
  );

  useEffectOnce(() => {
    const panel = titleRef.current?.closest('.euiContextMenuPanel');
    const focus = () => titleRef.current?.focus();

    panel?.addEventListener('animationend', focus, { once: true });

    return () => panel?.removeEventListener('animationend', focus);
  });

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      alignItems="center"
      css={[logicalCSS('border-bottom', euiTheme.border.thin)]}
    >
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <EuiContextMenuItem
            buttonRef={titleRef}
            className="euiContextMenuPanel__title"
            icon="arrowLeft"
            onClick={onTitleClick}
            onKeyDown={onTitleKeyDown}
            data-test-subj="contextMenuPanelTitleButton"
            css={{
              '&:enabled:focus': {
                /* Override the default focus background on EUiContextMenuItems */
                backgroundColor: 'unset',
              },
            }}
          >
            {queryBarMenuPanelsStrings.getLoadCurrentFilterSetLabel()}
          </EuiContextMenuItem>
        </EuiTitle>
      </EuiFlexItem>
      {canEditSavedObjects && (
        <EuiFlexItem grow={false} css={{ paddingInline: euiTheme.size.s }}>
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
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
