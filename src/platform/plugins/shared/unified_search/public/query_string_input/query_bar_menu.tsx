/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback, RefObject } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  EuiButtonIconProps,
  EuiToolTip,
} from '@elastic/eui';
import {
  EuiContextMenuClass,
  EuiContextMenuPanelId,
} from '@elastic/eui/src/components/context_menu/context_menu';
import { i18n } from '@kbn/i18n';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedQueryService, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  useQueryBarMenuPanels,
  QueryBarMenuPanelsProps,
  QueryBarMenuPanel,
  AdditionalQueryBarMenuItems,
} from './query_bar_menu_panels';
import { FilterEditorWrapper } from './filter_editor_wrapper';
import {
  withCloseFilterEditorConfirmModal,
  WithCloseFilterEditorConfirmModalProps,
} from '../filter_bar/filter_editor';
import { SuggestionsAbstraction } from '../typeahead/suggestions_component';

export const strings = {
  getFilterSetButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.filterSetButtonLabel', {
      defaultMessage: 'Query menu',
    }),
  getSavedQueryPopoverSaveChangesButtonText: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonText', {
      defaultMessage: 'Update query',
    }),
};

export interface QueryBarMenuProps extends WithCloseFilterEditorConfirmModalProps {
  language: string;
  onQueryChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onQueryBarSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  toggleFilterBarMenuPopover: (value: boolean) => void;
  openQueryBarMenu: boolean;
  nonKqlMode?: 'lucene' | 'text';
  disableQueryLanguageSwitcher?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  timeFilter?: SavedQueryTimeFilter;
  savedQueryService: SavedQueryService;
  saveAsNewQueryFormComponent?: JSX.Element;
  saveFormComponent?: JSX.Element;
  manageFilterSetComponent?: JSX.Element;
  hiddenPanelOptions?: QueryBarMenuPanelsProps['hiddenPanelOptions'];
  onFiltersUpdated?: (filters: Filter[]) => void;
  filters?: Filter[];
  additionalQueryBarMenuItems: AdditionalQueryBarMenuItems;
  query?: Query;
  savedQuery?: SavedQuery;
  onClearSavedQuery?: () => void;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  showSaveQuery?: boolean;
  showSavedQueryControls?: boolean;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  indexPatterns?: Array<DataView | string>;
  buttonProps?: Partial<EuiButtonIconProps>;
  isDisabled?: boolean;
  suggestionsAbstraction?: SuggestionsAbstraction;
  renderQueryInputAppend?: () => React.ReactNode;
  queryBarMenuRef: RefObject<EuiContextMenuClass>;
}

function QueryBarMenuComponent({
  language,
  nonKqlMode,
  disableQueryLanguageSwitcher,
  dateRangeFrom,
  dateRangeTo,
  timeFilter,
  onQueryChange,
  onQueryBarSubmit,
  savedQueryService,
  saveAsNewQueryFormComponent,
  saveFormComponent,
  manageFilterSetComponent,
  hiddenPanelOptions,
  openQueryBarMenu,
  toggleFilterBarMenuPopover,
  onFiltersUpdated,
  filters,
  additionalQueryBarMenuItems,
  query,
  savedQuery,
  onClearSavedQuery,
  showQueryInput,
  showFilterBar,
  showSaveQuery,
  showSavedQueryControls,
  indexPatterns,
  timeRangeForSuggestionsOverride,
  filtersForSuggestions,
  buttonProps,
  isDisabled,
  onCloseFilterPopover,
  onLocalFilterCreate,
  onLocalFilterUpdate,
  suggestionsAbstraction,
  queryBarMenuRef,
}: QueryBarMenuProps) {
  const [renderedComponent, setRenderedComponent] = useState('menu');
  const [currentPanelId, setCurrentPanelId] = useState<EuiContextMenuPanelId>(
    QueryBarMenuPanel.main
  );

  useEffect(() => {
    if (openQueryBarMenu) {
      setCurrentPanelId(QueryBarMenuPanel.main);
      setRenderedComponent('menu');
    }
  }, [openQueryBarMenu]);

  const plainClosePopover = useCallback(
    () => toggleFilterBarMenuPopover(false),
    [toggleFilterBarMenuPopover]
  );

  const closePopover = useCallback(() => {
    onCloseFilterPopover([plainClosePopover]);
  }, [onCloseFilterPopover, plainClosePopover]);

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'normalContextMenuPopover',
  });

  const onButtonClick = () => {
    toggleFilterBarMenuPopover(!openQueryBarMenu);
  };

  const button = (
    <EuiToolTip delay="long" content={strings.getFilterSetButtonLabel()}>
      <EuiButtonIcon
        size="m"
        display="empty"
        onClick={onButtonClick}
        isDisabled={isDisabled}
        {...buttonProps}
        css={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        iconType="filter"
        aria-label={strings.getFilterSetButtonLabel()}
        data-test-subj="showQueryBarMenu"
      />
    </EuiToolTip>
  );

  const panels = useQueryBarMenuPanels({
    filters,
    additionalQueryBarMenuItems,
    savedQuery,
    language,
    dateRangeFrom,
    dateRangeTo,
    timeFilter,
    query,
    showSaveQuery,
    showSavedQueryControls,
    showFilterBar,
    showQueryInput,
    savedQueryService,
    saveFormComponent,
    saveAsNewQueryFormComponent,
    manageFilterSetComponent,
    hiddenPanelOptions,
    nonKqlMode,
    disableQueryLanguageSwitcher,
    queryBarMenuRef,
    closePopover: plainClosePopover,
    onQueryBarSubmit,
    onFiltersUpdated,
    onClearSavedQuery,
    onQueryChange,
    setRenderedComponent,
  });

  const renderComponent = () => {
    switch (renderedComponent) {
      case 'menu':
        return (
          <EuiContextMenu
            // @ts-expect-error EuiContextMenu ref is mistyped
            ref={queryBarMenuRef}
            initialPanelId={QueryBarMenuPanel.main}
            panels={panels}
            onPanelChange={({ panelId }) => setCurrentPanelId(panelId)}
            data-test-subj="queryBarMenuPanel"
            css={[
              {
                // Add width to transition properties to smooth
                // the animation when the panel width changes
                transitionProperty: 'width, height !important',
                // Add a white background to panels since panels
                // of different widths can overlap each other
                // when transitioning, but the background colour
                // ensures the incoming panel always overlays
                // the outgoing panel which improves the effect
                '.euiContextMenuPanel': {
                  backgroundColor: euiThemeVars.euiColorEmptyShade,
                },
              },
              // Fix the update button underline on hover, and
              // the button focus outline being cut off
              currentPanelId === QueryBarMenuPanel.main && {
                '.euiContextMenuPanel__title': {
                  ':hover': {
                    textDecoration: 'none !important',
                  },
                  '.euiContextMenuItem__text': {
                    overflow: 'visible',
                  },
                },
              },
            ]}
          />
        );
      case 'addFilter':
        return (
          <EuiContextMenuPanel
            items={[
              <FilterEditorWrapper
                key="filter-editor-wrapper"
                indexPatterns={indexPatterns}
                filters={filters!}
                timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                filtersForSuggestions={filtersForSuggestions}
                onFiltersUpdated={onFiltersUpdated}
                onLocalFilterUpdate={onLocalFilterUpdate}
                onLocalFilterCreate={onLocalFilterCreate}
                closePopoverOnAdd={plainClosePopover}
                closePopoverOnCancel={plainClosePopover}
                suggestionsAbstraction={suggestionsAbstraction}
              />,
            ]}
          />
        );
    }
  };

  return (
    <EuiPopover
      id={normalContextMenuPopoverId}
      button={button}
      isOpen={openQueryBarMenu}
      closePopover={renderedComponent === 'addFilter' ? closePopover : plainClosePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      repositionOnScroll
      data-test-subj="queryBarMenuPopover"
    >
      {renderComponent()}
    </EuiPopover>
  );
}

export const QueryBarMenu = withCloseFilterEditorConfirmModal(QueryBarMenuComponent);
