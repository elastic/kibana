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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter, Query } from '@kbn/es-query';
import type { TimeRange, SavedQueryService, SavedQuery } from '../../../data/public';
import { QueryBarMenuPanels } from './query_bar_menu_panels';

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
  onFiltersUpdated?: (filters: Filter[]) => void;
  filters?: Filter[];
  query?: Query;
  savedQuery?: SavedQuery;
  onClearSavedQuery?: () => void;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  showSaveQuery?: boolean;
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

  const buttonLabel = i18n.translate('data.filter.options.filterSetButtonLabel', {
    defaultMessage: 'Filter set menu',
  });

  const button = (
    <EuiButtonIcon
      size="m"
      display="base"
      onClick={onButtonClick}
      iconType="filter"
      aria-label={buttonLabel}
      title={buttonLabel}
      data-test-subj="showQueryBarMenu"
    />
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
        anchorPosition="rightUp"
        repositionOnScroll
        data-test-subj="queryBarMenuPopover"
      >
        {renderComponent()}
      </EuiPopover>
    </>
  );
}
