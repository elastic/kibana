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
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiPagination,
  EuiFieldSearch,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiHighlight,
  EuiIcon,
  EuiBadge,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, {
  useCallback,
  useEffect,
  useState,
  Fragment,
  useRef,
  ReactElement,
  ReactNode,
} from 'react';
import { sortBy } from 'lodash';
import { SavedQuery, SavedQueryService, SavedQueryTimeFilter } from '../..';
import { SavedQueryListItem } from './saved_query_list_item';

interface TablePage {
  page: {
    index: number;
    size: number;
  };
}

const perPage = 50;
interface Props {
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  selectedSavedQueries: SavedQuery[];
  onSave: () => void;
  onSaveAsNew: () => void;
  onLoad: (savedQueries: SavedQuery[]) => void;
  onClearSavedQuery: () => void;
  /**
   * Function that takes the `list` node and then
   * the `search` node (if `searchable` is applied)
   */
  children: (
    list: ReactElement
    // search: ReactElement<EuiSelectableSearch<T>> | undefined
  ) => JSX.Element;
}

export function SavedQueryManagementComponent({
  showSaveQuery,
  loadedSavedQuery,
  onSave,
  onSaveAsNew,
  onLoad,
  onClearSavedQuery,
  savedQueryService,
  selectedSavedQueries,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [count, setTotalCount] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageSize, setPageSize] = useState(perPage);
  const [searchValue, setSearchValue] = useState('');
  const [savedQueriesBySearch, setSavedQueriesBySearch] = useState([] as SavedQuery[]);
  const [selectedQueries, setSelectedQueries] = useState(selectedSavedQueries);

  const cancelPendingListingRequest = useRef<() => void>(() => {});

  useEffect(() => {
    const fetchCountAndSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { total: savedQueryCount, queries: savedQueryItems } =
        await savedQueryService.findSavedQueries('', pageSize, activePage + 1);

      if (requestGotCancelled) return;

      const sortedSavedQueryItems = sortBy(savedQueryItems, 'attributes.title');
      setTotalCount(savedQueryCount);
      setSavedQueries(sortedSavedQueryItems);
      setSavedQueriesBySearch(sortedSavedQueryItems);
    };
    if (isOpen) {
      fetchCountAndSavedQueries();
    }
  }, [isOpen, activePage, savedQueryService, pageSize]);

  const handleTogglePopover = useCallback(
    () => setIsOpen((currentState) => !currentState),
    [setIsOpen]
  );

  const handleClosePopover = useCallback(() => setIsOpen(false), []);

  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  const handleSaveAsNew = useCallback(() => {
    onSaveAsNew();
  }, [onSaveAsNew]);

  const handleSelect = useCallback(
    (savedQueryToSelect) => {
      onLoad(savedQueryToSelect);
    },
    [onLoad]
  );

  const handleDelete = useCallback(
    (savedQueryToDelete: SavedQuery) => {
      const onDeleteSavedQuery = async (savedQuery: SavedQuery) => {
        cancelPendingListingRequest.current();
        const updatedSavedQueries = savedQueries.filter(
          (currentSavedQuery) => currentSavedQuery.id !== savedQuery.id
        );
        setSavedQueries(updatedSavedQueries);
        setSavedQueriesBySearch(updatedSavedQueries);

        if (loadedSavedQuery && loadedSavedQuery.id === savedQuery.id) {
          onClearSavedQuery();
        }

        await savedQueryService.deleteSavedQuery(savedQuery.id);
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

  const savedQueryPopoverTitleText = i18n.translate(
    'data.search.searchBar.savedQueryPopoverTitleText',
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
    // const savedQueriesWithoutCurrent = savedQueries.filter((savedQuery) => {
    //   if (!loadedSavedQuery) return true;
    //   return savedQuery.id !== loadedSavedQuery.id;
    // });
    // const savedQueriesReordered =
    //   loadedSavedQuery && savedQueriesWithoutCurrent.length !== savedQueries.length
    //     ? [loadedSavedQuery, ...savedQueriesWithoutCurrent]
    //     : [...savedQueriesWithoutCurrent];
    // DON'T SORT
    return savedQueriesBySearch.map((savedQuery) => (
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

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
    const newSavedQueriesList = savedQueries.filter((savedQuery) => {
      return savedQuery.attributes.title.toLowerCase().includes(value.toLowerCase());
    });
    setSavedQueriesBySearch(newSavedQueriesList);
  };

  const onSelectionChange = useCallback(
    (selectedItems: SavedQuery[]) => {
      setSelectedQueries(selectedItems);
      onLoad(selectedItems);
    },
    [onLoad]
  );

  const onTableChange = ({ page }: TablePage) => {
    const { index: pageIndex, size } = page;
    setActivePage(pageIndex);
    setPageSize(size);
  };

  const tableActions = [
    {
      name: <span>Delete</span>,
      description: 'Delete this saved filter',
      icon: 'trash',
      color: 'danger',
      type: 'icon',
      onClick: handleDelete,
      isPrimary: true,
      'data-test-subj': 'action-delete',
    },
  ];

  const tableColumns = [
    {
      field: 'attributes.title',
      name: 'Name',
      sortable: true,
      render: (title: string) => <EuiHighlight search={searchValue}>{title}</EuiHighlight>,
    },
    {
      field: 'attributes.query.language',
      name: 'Language',
      truncateText: false,
      width: '100px',
      render: (language: string) => <EuiBadge>{language === 'kuery' ? 'KQL' : language}</EuiBadge>,
    },
    {
      field: 'attributes.timefilter',
      name: 'Time filter',
      render: (timefilter: SavedQueryTimeFilter) => <span> {timefilter?.from ?? ''}</span>,
    },
    {
      name: 'Actions',
      actions: tableActions,
      width: '70px',
    } as EuiBasicTableColumn<SavedQuery>,
  ];

  const pagination = {
    pageIndex: activePage,
    pageSize,
    totalItemCount: count,
  };

  const emptyState = (
    <EuiEmptyPrompt
      title={<h3>No saved filters</h3>}
      titleSize="s"
      body={
        <p>
          Saved filters allow you to reuse all or parts of your query including the time filter. To
          create a saved filter, open the <EuiIcon type="filter" color="primary" /> Filter Menu and
          select “Save current filter set”.
        </p>
      }
    />
  );

  const component = (
    <>
      <EuiFieldSearch
        placeholder="Find a saved filter..."
        value={searchValue}
        fullWidth
        onChange={onInputChange}
        isClearable={true}
        aria-label="Search..."
        compressed
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption="Saved filters list"
        items={savedQueriesBySearch}
        itemId="id"
        columns={tableColumns}
        pagination={pagination}
        selection={{ onSelectionChange, initialSelected: selectedQueries }}
        hasActions={true}
        onChange={onTableChange}
      />
    </>
  );

  // NEW RETURN : Just the list
  return children(savedQueries.length ? component : emptyState);

  // OLD RETURN
  // return (
  //   <Fragment>
  //     <EuiPopover
  //       id="savedQueryPopover"
  //       button={savedQueryPopoverButton}
  //       isOpen={isOpen}
  //       closePopover={handleClosePopover}
  //       anchorPosition="downLeft"
  //       panelPaddingSize="none"
  //       buffer={-8}
  //       repositionOnScroll
  //       ownFocus={true}
  //     >
  //       <div
  //         className="kbnSavedQueryManagement__popover"
  //         data-test-subj="saved-query-management-popover"
  //       >
  //         <EuiPopoverTitle paddingSize="m" id={'savedQueryManagementPopoverTitle'}>
  //           {savedQueryPopoverTitleText}
  //         </EuiPopoverTitle>
  //         {savedQueries.length > 0 ? (
  //           <Fragment>
  //             <EuiText size="s" color="subdued" className="kbnSavedQueryManagement__text">
  //               <p>{savedQueryDescriptionText}</p>
  //             </EuiText>
  //             <div className="kbnSavedQueryManagement__listWrapper">
  //               <EuiListGroup
  //                 flush={true}
  //                 className="kbnSavedQueryManagement__list"
  //                 aria-labelledby={'savedQueryManagementPopoverTitle'}
  //               >
  //                 {savedQueryRows()}
  //               </EuiListGroup>
  //             </div>
  //             <EuiPagination
  //               className="kbnSavedQueryManagement__pagination"
  //               pageCount={Math.ceil(count / perPage)}
  //               activePage={activePage}
  //               onPageClick={goToPage}
  //             />
  //           </Fragment>
  //         ) : (
  //           <Fragment>
  //             <EuiText size="s" color="subdued" className="kbnSavedQueryManagement__text">
  //               <p>{noSavedQueriesDescriptionText}</p>
  //             </EuiText>
  //             <EuiSpacer size="s" />
  //           </Fragment>
  //         )}
  //         <EuiPopoverFooter paddingSize="m">
  //           <EuiFlexGroup
  //             direction="rowReverse"
  //             gutterSize="s"
  //             alignItems="center"
  //             justifyContent="flexEnd"
  //             responsive={false}
  //             wrap={true}
  //           >
  //             {showSaveQuery && loadedSavedQuery && (
  //               <Fragment>
  //                 <EuiFlexItem grow={false}>
  //                   <EuiButton
  //                     size="s"
  //                     fill
  //                     onClick={handleSave}
  //                     aria-label={i18n.translate(
  //                       'data.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel',
  //                       {
  //                         defaultMessage: 'Save changes to {title}',
  //                         values: { title: loadedSavedQuery.attributes.title },
  //                       }
  //                     )}
  //                     data-test-subj="saved-query-management-save-changes-button"
  //                   >
  //                     {i18n.translate(
  //                       'data.search.searchBar.savedQueryPopoverSaveChangesButtonText',
  //                       {
  //                         defaultMessage: 'Save changes',
  //                       }
  //                     )}
  //                   </EuiButton>
  //                 </EuiFlexItem>
  //                 <EuiFlexItem grow={false}>
  //                   <EuiButton
  //                     size="s"
  //                     onClick={handleSaveAsNew}
  //                     aria-label={i18n.translate(
  //                       'data.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel',
  //                       {
  //                         defaultMessage: 'Save as new saved query',
  //                       }
  //                     )}
  //                     data-test-subj="saved-query-management-save-as-new-button"
  //                   >
  //                     {i18n.translate(
  //                       'data.search.searchBar.savedQueryPopoverSaveAsNewButtonText',
  //                       {
  //                         defaultMessage: 'Save as new',
  //                       }
  //                     )}
  //                   </EuiButton>
  //                 </EuiFlexItem>
  //               </Fragment>
  //             )}
  //             {showSaveQuery && !loadedSavedQuery && (
  //               <EuiFlexItem grow={false}>
  //                 <EuiButton
  //                   size="s"
  //                   fill
  //                   onClick={handleSave}
  //                   aria-label={i18n.translate(
  //                     'data.search.searchBar.savedQueryPopoverSaveButtonAriaLabel',
  //                     { defaultMessage: 'Save a new saved query' }
  //                   )}
  //                   data-test-subj="saved-query-management-save-button"
  //                 >
  //                   {i18n.translate('data.search.searchBar.savedQueryPopoverSaveButtonText', {
  //                     defaultMessage: 'Save current query',
  //                   })}
  //                 </EuiButton>
  //               </EuiFlexItem>
  //             )}
  //             <EuiFlexItem />
  //             <EuiFlexItem grow={false}>
  //               {loadedSavedQuery && (
  //                 <EuiButtonEmpty
  //                   size="s"
  //                   flush="left"
  //                   onClick={onClearSavedQuery}
  //                   aria-label={i18n.translate(
  //                     'data.search.searchBar.savedQueryPopoverClearButtonAriaLabel',
  //                     { defaultMessage: 'Clear current saved query' }
  //                   )}
  //                   data-test-subj="saved-query-management-clear-button"
  //                 >
  //                   {i18n.translate('data.search.searchBar.savedQueryPopoverClearButtonText', {
  //                     defaultMessage: 'Clear',
  //                   })}
  //                 </EuiButtonEmpty>
  //               )}
  //             </EuiFlexItem>
  //           </EuiFlexGroup>
  //         </EuiPopoverFooter>
  //       </div>
  //     </EuiPopover>
  //   </Fragment>
  // );
}
