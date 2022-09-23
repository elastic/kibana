/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  EuiButtonIconProps,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedQueryService, SavedQuery } from '@kbn/data-plugin/public';
import { QueryBarMenuPanels, QueryBarMenuPanelsProps } from './query_bar_menu_panels';
import { FilterEditorWrapper } from './filter_editor_wrapper';

export interface QueryBarMenuProps {
  language: string;
  onQueryChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onQueryBarSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  toggleFilterBarMenuPopover: (value: boolean) => void;
  openQueryBarMenu: boolean;
  nonKqlMode?: 'lucene' | 'text';
  dateRangeFrom?: string;
  dateRangeTo?: string;
  savedQueryService: SavedQueryService;
  saveAsNewQueryFormComponent?: JSX.Element;
  saveFormComponent?: JSX.Element;
  manageFilterSetComponent?: JSX.Element;
  hiddenPanelOptions?: QueryBarMenuPanelsProps['hiddenPanelOptions'];
  onFiltersUpdated?: (filters: Filter[]) => void;
  filters?: Filter[];
  query?: Query;
  savedQuery?: SavedQuery;
  onClearSavedQuery?: () => void;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  showSaveQuery?: boolean;
  timeRangeForSuggestionsOverride?: boolean;
  indexPatterns?: Array<DataView | string>;
  buttonProps?: Partial<EuiButtonIconProps>;
  isDisabled?: boolean;
}

export function QueryBarMenu({
  language,
  nonKqlMode,
  dateRangeFrom,
  dateRangeTo,
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
  query,
  savedQuery,
  onClearSavedQuery,
  showQueryInput,
  showFilterBar,
  showSaveQuery,
  indexPatterns,
  timeRangeForSuggestionsOverride,
  buttonProps,
  isDisabled,
}: QueryBarMenuProps) {
  const [renderedComponent, setRenderedComponent] = useState('menu');

  useEffect(() => {
    if (openQueryBarMenu) {
      setRenderedComponent('menu');
    }
  }, [openQueryBarMenu]);

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'normalContextMenuPopover',
  });
  const onButtonClick = () => {
    toggleFilterBarMenuPopover(!openQueryBarMenu);
  };

  const closePopover = () => {
    toggleFilterBarMenuPopover(false);
  };

  const buttonLabel = i18n.translate('unifiedSearch.filter.options.filterSetButtonLabel', {
    defaultMessage: 'Saved query menu',
  });

  const button = (
    <EuiToolTip delay="long" content={buttonLabel}>
      <EuiButtonIcon
        size="m"
        display="empty"
        onClick={onButtonClick}
        isDisabled={isDisabled}
        {...buttonProps}
        iconType="filter"
        aria-label={buttonLabel}
        data-test-subj="showQueryBarMenu"
      />
    </EuiToolTip>
  );

  const panels = QueryBarMenuPanels({
    filters,
    savedQuery,
    language,
    dateRangeFrom,
    dateRangeTo,
    query,
    showSaveQuery,
    showFilterBar,
    showQueryInput,
    savedQueryService,
    saveAsNewQueryFormComponent,
    manageFilterSetComponent,
    hiddenPanelOptions,
    nonKqlMode,
    closePopover,
    onQueryBarSubmit,
    onFiltersUpdated,
    onClearSavedQuery,
    onQueryChange,
    setRenderedComponent,
  });

  const renderComponent = () => {
    switch (renderedComponent) {
      case 'menu':
      default:
        return (
          <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="queryBarMenuPanel" />
        );
      case 'saveForm':
        return (
          <EuiContextMenuPanel items={[<div style={{ padding: 16 }}>{saveFormComponent}</div>]} />
        );
      case 'saveAsNewForm':
        return (
          <EuiContextMenuPanel
            items={[<div style={{ padding: 16 }}>{saveAsNewQueryFormComponent}</div>]}
          />
        );
      case 'addFilter':
        return (
          <EuiContextMenuPanel
            items={[
              <FilterEditorWrapper
                indexPatterns={indexPatterns}
                filters={filters!}
                timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                onFiltersUpdated={onFiltersUpdated}
                closePopover={closePopover}
              />,
            ]}
          />
        );
    }
  };

  return (
    <>
      <EuiPopover
        id={normalContextMenuPopoverId}
        button={button}
        isOpen={openQueryBarMenu}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        repositionOnScroll
        data-test-subj="queryBarMenuPopover"
      >
        {renderComponent()}
      </EuiPopover>
    </>
  );
}
