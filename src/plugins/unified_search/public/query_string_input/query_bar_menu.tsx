/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  EuiButtonIconProps,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedQueryService, SavedQuery } from '@kbn/data-plugin/public';
import { QueryBarMenuPanels, QueryBarMenuPanelsProps } from './query_bar_menu_panels';
import { FilterEditorWrapper } from './filter_editor_wrapper';
import { popoverDragAndDropCss } from './add_filter_popover.styles';
import {
  withCloseFilterEditorConfirmModal,
  WithCloseFilterEditorConfirmModalProps,
} from '../filter_bar/filter_editor';

export const strings = {
  getFilterSetButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.filterSetButtonLabel', {
      defaultMessage: 'Saved query menu',
    }),
};

export interface QueryBarMenuProps extends WithCloseFilterEditorConfirmModalProps {
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

function QueryBarMenuComponent({
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
  onCloseFilterPopover,
  onLocalFilterCreate,
  onLocalFilterUpdate,
}: QueryBarMenuProps) {
  const [renderedComponent, setRenderedComponent] = useState('menu');

  const euiTheme = useEuiTheme();

  useEffect(() => {
    if (openQueryBarMenu) {
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
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        iconType="filter"
        aria-label={strings.getFilterSetButtonLabel()}
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
                key="filter-editor-wrapper"
                indexPatterns={indexPatterns}
                filters={filters!}
                timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                onFiltersUpdated={onFiltersUpdated}
                onLocalFilterUpdate={onLocalFilterUpdate}
                onLocalFilterCreate={onLocalFilterCreate}
                closePopoverOnAdd={plainClosePopover}
                closePopoverOnCancel={plainClosePopover}
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
        closePopover={renderedComponent === 'addFilter' ? closePopover : plainClosePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        repositionOnScroll
        data-test-subj="queryBarMenuPopover"
        panelProps={{
          css: popoverDragAndDropCss(euiTheme),
        }}
      >
        {renderComponent()}
      </EuiPopover>
    </>
  );
}

export const QueryBarMenu = withCloseFilterEditorConfirmModal(QueryBarMenuComponent);
