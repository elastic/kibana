/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useRef, useEffect, RefObject } from 'react';
import { isEqual } from 'lodash';
import {
  EuiContextMenuPanelDescriptor,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import {
  Filter,
  Query,
  TimeRange,
  enableFilter,
  disableFilter,
  toggleFilterNegated,
  pinFilter,
  unpinFilter,
  COMPARE_ALL_OPTIONS,
  compareFilters,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  KIBANA_USER_QUERY_LANGUAGE_KEY,
  KQL_TELEMETRY_ROUTE_LATEST_VERSION,
  UI_SETTINGS,
} from '@kbn/data-plugin/common';
import type { SavedQueryService, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import type { IUnifiedSearchPluginServices } from '../types';
import { fromUser } from './from_user';
import { QueryLanguageSwitcher } from './language_switcher';
import { FilterPanelOption } from '../types';
import { PanelTitle } from './panel_title';

const MAP_ITEMS_TO_FILTER_OPTION: Record<string, FilterPanelOption> = {
  'filter-sets-pinAllFilters': 'pinFilter',
  'filter-sets-unpinAllFilters': 'pinFilter',
  'filter-sets-enableAllFilters': 'disableFilter',
  'filter-sets-disableAllFilters': 'disableFilter',
  'filter-sets-invertAllFilters': 'negateFilter',
  'filter-sets-removeAllFilters': 'deleteFilter',
};

export const strings = {
  getLuceneLanguageName: () =>
    i18n.translate('unifiedSearch.query.queryBar.luceneLanguageName', {
      defaultMessage: 'Lucene',
    }),
  getKqlLanguageName: () =>
    i18n.translate('unifiedSearch.query.queryBar.kqlLanguageName', {
      defaultMessage: 'KQL',
    }),
  getOptionsAddFilterButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.addFilterButtonLabel', {
      defaultMessage: 'Add filter',
    }),
  getOptionsApplyAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.applyAllFiltersButtonLabel', {
      defaultMessage: 'Apply to all',
    }),
  getLoadOtherFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.loadOtherFilterSetLabel', {
      defaultMessage: 'Load query',
    }),
  getLoadCurrentFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.loadCurrentFilterSetLabel', {
      defaultMessage: 'Load query',
    }),
  getSaveAsNewFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.saveAsNewFilterSetLabel', {
      defaultMessage: 'Save query',
    }),
  getSaveFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.saveFilterSetLabel', {
      defaultMessage: 'Save query',
    }),
  getClearAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.clearllFiltersButtonLabel', {
      defaultMessage: 'Clear all',
    }),
  getSavedQueryPopoverSaveChangesButtonAriaLabel: (title?: string) =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel', {
      defaultMessage: 'Save changes to {title}',
      values: { title },
    }),
  getSavedQueryPopoverSaveChangesButtonText: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonText', {
      defaultMessage: 'Update query',
    }),
  getSavedQueryPopoverSaveAsNewButtonAriaLabel: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel', {
      defaultMessage: 'Save as new query',
    }),
  getSavedQueryPopoverSaveAsNewButtonText: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveAsNewButtonText', {
      defaultMessage: 'Save as new',
    }),
  getSaveCurrentFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.saveCurrentFilterSetLabel', {
      defaultMessage: 'Save as new',
    }),
  getApplyAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.applyAllFiltersButtonLabel', {
      defaultMessage: 'Apply to all',
    }),
  getEnableAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.enableAllFiltersButtonLabel', {
      defaultMessage: 'Enable all',
    }),
  getDisableAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.disableAllFiltersButtonLabel', {
      defaultMessage: 'Disable all',
    }),
  getInvertNegatedFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.invertNegatedFiltersButtonLabel', {
      defaultMessage: 'Invert inclusion',
    }),
  getPinAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.pinAllFiltersButtonLabel', {
      defaultMessage: 'Pin all',
    }),
  getUnpinAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.unpinAllFiltersButtonLabel', {
      defaultMessage: 'Unpin all',
    }),
  getFilterLanguageLabel: () =>
    i18n.translate('unifiedSearch.filter.options.filterLanguageLabel', {
      defaultMessage: 'Filter language',
    }),
  getQuickFiltersLabel: () =>
    i18n.translate('unifiedSearch.filter.options.quickFiltersLabel', {
      defaultMessage: 'Quick filters',
    }),
};

export enum QueryBarMenuPanel {
  main = 'main',
  applyToAllFilters = 'applyToAllFilters',
  updateCurrentQuery = 'updateCurrentQuery',
  saveAsNewQuery = 'saveAsNewQuery',
  loadQuery = 'loadQuery',
  selectLanguage = 'selectLanguage',
}

export interface AdditionalQueryBarMenuItems {
  items?: EuiContextMenuPanelItemDescriptor[];
  panels?: EuiContextMenuPanelDescriptor[];
}

export interface QueryBarMenuPanelsProps {
  filters?: Filter[];
  additionalQueryBarMenuItems: AdditionalQueryBarMenuItems;
  savedQuery?: SavedQuery;
  language: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  timeFilter?: SavedQueryTimeFilter;
  query?: Query;
  showSaveQuery?: boolean;
  showSavedQueryControls?: boolean;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  savedQueryService: SavedQueryService;
  saveFormComponent?: JSX.Element;
  saveAsNewQueryFormComponent?: JSX.Element;
  manageFilterSetComponent?: JSX.Element;
  hiddenPanelOptions?: FilterPanelOption[];
  nonKqlMode?: 'lucene' | 'text';
  disableQueryLanguageSwitcher?: boolean;
  queryBarMenuRef: RefObject<EuiContextMenuClass>;
  closePopover: () => void;
  onQueryBarSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
  onClearSavedQuery?: () => void;
  onQueryChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  setRenderedComponent: (component: string) => void;
}

export function useQueryBarMenuPanels({
  filters,
  additionalQueryBarMenuItems,
  savedQuery,
  language,
  dateRangeFrom,
  dateRangeTo,
  timeFilter,
  query,
  showSaveQuery,
  showSavedQueryControls = true,
  showFilterBar,
  showQueryInput,
  savedQueryService,
  saveFormComponent,
  saveAsNewQueryFormComponent,
  manageFilterSetComponent,
  hiddenPanelOptions,
  nonKqlMode,
  disableQueryLanguageSwitcher = false,
  queryBarMenuRef,
  closePopover,
  onQueryBarSubmit,
  onFiltersUpdated,
  onClearSavedQuery,
  onQueryChange,
  setRenderedComponent,
}: QueryBarMenuPanelsProps) {
  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { appName, usageCollection, uiSettings, http, storage, application } = kibana.services;
  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);
  const showSavedQueries =
    showSavedQueryControls &&
    showQueryInput &&
    showFilterBar &&
    application.capabilities.savedQueryManagement?.showQueries;
  const cancelPendingListingRequest = useRef<() => void>(() => {});

  const [hasSavedQueries, setHasSavedQueries] = useState(false);
  const [hasFiltersOrQuery, setHasFiltersOrQuery] = useState(false);
  const [savedQueryHasChanged, setSavedQueryHasChanged] = useState(false);

  useEffect(() => {
    if (savedQuery) {
      cancelPendingListingRequest.current();
      setHasSavedQueries(true);
    }
  }, [savedQuery]);

  useEffect(() => {
    const fetchSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const queryCount = await savedQueryService.getSavedQueryCount();

      if (requestGotCancelled) return;

      setHasSavedQueries(queryCount > 0);
    };
    if (showSavedQueries) {
      fetchSavedQueries();
    }
  }, [savedQueryService, showSavedQueries]);

  useEffect(() => {
    if (savedQuery) {
      const filtersHaveChanged = Boolean(
        savedQuery?.attributes.filters &&
          !compareFilters(filters ?? [], savedQuery.attributes.filters, COMPARE_ALL_OPTIONS)
      );

      const timeFilterHasChanged = Boolean(
        savedQuery?.attributes.timefilter && !isEqual(timeFilter, savedQuery?.attributes.timefilter)
      );

      if (
        filtersHaveChanged ||
        timeFilterHasChanged ||
        !isEqual(query, savedQuery?.attributes.query)
      ) {
        setSavedQueryHasChanged(true);
      } else {
        setSavedQueryHasChanged(false);
      }
    }
  }, [filters, query, savedQuery, timeFilter]);

  useEffect(() => {
    const hasFilters = Boolean(filters && filters.length > 0);
    const hasQuery = Boolean(query && query.query);
    setHasFiltersOrQuery(hasFilters || hasQuery);
  }, [filters, onClearSavedQuery, query, savedQuery]);

  const getDateRange = () => {
    const defaultTimeSetting = uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
    return {
      from: dateRangeFrom || defaultTimeSetting.from,
      to: dateRangeTo || defaultTimeSetting.to,
    };
  };

  const onEnableAll = () => {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:enable_all`);
    const enabledFilters = filters?.map(enableFilter);
    if (enabledFilters) {
      onFiltersUpdated?.(enabledFilters);
    }
  };

  const onDisableAll = () => {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:disable_all`);
    const disabledFilters = filters?.map(disableFilter);
    if (disabledFilters) {
      onFiltersUpdated?.(disabledFilters);
    }
  };

  const onToggleAllNegated = () => {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:invert_all`);
    const negatedFilters = filters?.map(toggleFilterNegated);
    if (negatedFilters) {
      onFiltersUpdated?.(negatedFilters);
    }
  };

  const onRemoveAll = () => {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:remove_all`);
    onFiltersUpdated?.([]);
  };

  const onPinAll = () => {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:pin_all`);
    const pinnedFilters = filters?.map(pinFilter);
    if (pinnedFilters) {
      onFiltersUpdated?.(pinnedFilters);
    }
  };

  const onUnpinAll = () => {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:unpin_all`);
    const unPinnedFilters = filters?.map(unpinFilter);
    if (unPinnedFilters) {
      onFiltersUpdated?.(unPinnedFilters);
    }
  };

  const onQueryStringChange = (value: string) => {
    onQueryChange({
      query: { query: value, language },
      dateRange: getDateRange(),
    });
  };

  const onSelectLanguage = (lang: string) => {
    http.post('/internal/kql_opt_in_stats', {
      version: KQL_TELEMETRY_ROUTE_LATEST_VERSION,
      body: JSON.stringify({ opt_in: lang === 'kuery' }),
    });

    const storageKey = KIBANA_USER_QUERY_LANGUAGE_KEY;
    storage.set(storageKey!, lang);

    const newQuery = { query: '', language: lang };
    onQueryStringChange(newQuery.query);
    onQueryBarSubmit({
      query: { query: fromUser(newQuery.query), language: newQuery.language },
      dateRange: getDateRange(),
    });
  };

  const luceneLabel = strings.getLuceneLanguageName();
  const kqlLabel = strings.getKqlLanguageName();

  const filtersRelatedPanels: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: strings.getOptionsAddFilterButtonLabel(),
      icon: 'plus',
      onClick: () => {
        setRenderedComponent('addFilter');
      },
    },
    {
      name: strings.getOptionsApplyAllFiltersButtonLabel(),
      icon: 'filter',
      panel: QueryBarMenuPanel.applyToAllFilters,
      disabled: !Boolean(filters && filters.length > 0),
      'data-test-subj': 'filter-sets-applyToAllFilters',
    },
  ];

  const queryAndFiltersRelatedPanels: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: savedQuery
        ? strings.getLoadOtherFilterSetLabel()
        : strings.getLoadCurrentFilterSetLabel(),
      panel: QueryBarMenuPanel.loadQuery,
      icon: 'filter',
      'data-test-subj': 'saved-query-management-load-button',
      disabled: !hasSavedQueries || !Boolean(manageFilterSetComponent),
    },
    {
      name: savedQuery ? strings.getSaveAsNewFilterSetLabel() : strings.getSaveFilterSetLabel(),
      icon: 'save',
      disabled:
        !Boolean(showSaveQuery) || !hasFiltersOrQuery || (savedQuery && !savedQueryHasChanged),
      panel: QueryBarMenuPanel.saveAsNewQuery,
      'data-test-subj': 'saved-query-management-save-button',
    },
    { isSeparator: true },
  ];

  const items: EuiContextMenuPanelItemDescriptor[] = [];
  // apply to all actions are only shown when there are filters
  if (showFilterBar) {
    items.push(...filtersRelatedPanels);
  }
  // clear all actions are only shown when there are filters or query
  if (showFilterBar || showQueryInput) {
    items.push(
      {
        name: strings.getClearAllFiltersButtonLabel(),
        disabled: !hasFiltersOrQuery && !Boolean(savedQuery),
        icon: 'cross',
        'data-test-subj': 'filter-sets-removeAllFilters',
        onClick: () => {
          closePopover();
          onQueryBarSubmit({
            query: { query: '', language },
            dateRange: getDateRange(),
          });
          onRemoveAll();
          onClearSavedQuery?.();
        },
      },
      { isSeparator: true }
    );
  }

  if (showFilterBar && additionalQueryBarMenuItems.items?.length) {
    items.push(...[...additionalQueryBarMenuItems.items, { isSeparator: true } as const]);
  }

  // saved queries actions are only shown when the showQueryInput and showFilterBar is true
  if (showSavedQueries) {
    items.push(...queryAndFiltersRelatedPanels);
  }

  // language menu appears when the showQueryInput is true
  if (showQueryInput && !disableQueryLanguageSwitcher) {
    items.push({
      name: `Language: ${language === 'kuery' ? kqlLabel : luceneLabel}`,
      panel: QueryBarMenuPanel.selectLanguage,
      'data-test-subj': 'switchQueryLanguageButton',
    });
  }

  let panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: QueryBarMenuPanel.main,
      title: savedQuery?.attributes.title ? (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText
                color={savedQuery ? 'primary' : 'default'}
                size="s"
                data-test-subj="savedQueryTitle"
              >
                <strong>{savedQuery.attributes.title}</strong>
              </EuiText>
            </EuiFlexItem>
            {savedQuery && savedQueryHasChanged && Boolean(showSaveQuery) && hasFiltersOrQuery && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  onClick={() => {
                    queryBarMenuRef.current?.showPanel(
                      QueryBarMenuPanel.updateCurrentQuery,
                      'next'
                    );
                  }}
                  aria-label={strings.getSavedQueryPopoverSaveChangesButtonAriaLabel(
                    savedQuery?.attributes.title
                  )}
                  data-test-subj="saved-query-management-save-changes-button"
                >
                  {strings.getSavedQueryPopoverSaveChangesButtonText()}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      ) : undefined,
      items,
    },
    {
      id: QueryBarMenuPanel.applyToAllFilters,
      initialFocusedItemIndex: 1,
      title: strings.getApplyAllFiltersButtonLabel(),
      items: [
        {
          name: strings.getEnableAllFiltersButtonLabel(),
          icon: 'eye',
          'data-test-subj': 'filter-sets-enableAllFilters',
          onClick: () => {
            closePopover();
            onEnableAll();
          },
        },
        {
          name: strings.getDisableAllFiltersButtonLabel(),
          'data-test-subj': 'filter-sets-disableAllFilters',
          icon: 'eyeClosed',
          onClick: () => {
            closePopover();
            onDisableAll();
          },
        },
        {
          name: strings.getInvertNegatedFiltersButtonLabel(),
          'data-test-subj': 'filter-sets-invertAllFilters',
          icon: 'invert',
          onClick: () => {
            closePopover();
            onToggleAllNegated();
          },
        },
        {
          name: strings.getPinAllFiltersButtonLabel(),
          'data-test-subj': 'filter-sets-pinAllFilters',
          icon: 'pin',
          onClick: () => {
            closePopover();
            onPinAll();
          },
        },
        {
          name: strings.getUnpinAllFiltersButtonLabel(),
          'data-test-subj': 'filter-sets-unpinAllFilters',
          icon: 'pin',
          onClick: () => {
            closePopover();
            onUnpinAll();
          },
        },
      ],
    },
    {
      id: QueryBarMenuPanel.updateCurrentQuery,
      content: (
        <>
          <PanelTitle
            queryBarMenuRef={queryBarMenuRef}
            title={strings.getSavedQueryPopoverSaveChangesButtonText()}
          />
          <div css={{ padding: euiThemeVars.euiSizeM }}>{saveFormComponent}</div>
        </>
      ),
    },
    {
      id: QueryBarMenuPanel.saveAsNewQuery,
      title: strings.getSaveCurrentFilterSetLabel(),
      content: <div css={{ padding: euiThemeVars.euiSizeM }}>{saveAsNewQueryFormComponent}</div>,
    },
    {
      id: QueryBarMenuPanel.loadQuery,
      width: 400,
      content: <div>{manageFilterSetComponent}</div>,
    },
    {
      id: QueryBarMenuPanel.selectLanguage,
      title: strings.getFilterLanguageLabel(),
      content: (
        <QueryLanguageSwitcher
          language={language}
          onSelectLanguage={onSelectLanguage}
          nonKqlMode={nonKqlMode}
          isOnTopBarMenu={true}
          deps={{
            docLinks: kibana.services.docLinks,
          }}
        />
      ),
    },
    {
      id: 4,
      title: strings.getLoadCurrentFilterSetLabel(),
      width: 400,
      content: <div>{manageFilterSetComponent}</div>,
    },
    ...(additionalQueryBarMenuItems.panels ?? []),
  ] as EuiContextMenuPanelDescriptor[];

  if (hiddenPanelOptions && hiddenPanelOptions.length > 0) {
    panels = panels.map((panel) => ({
      ...panel,
      items: panel.items?.filter((panelItem) => {
        if (!panelItem['data-test-subj']) {
          return true;
        }
        const panelFilterOption = MAP_ITEMS_TO_FILTER_OPTION[panelItem['data-test-subj']];
        if (!panelFilterOption) {
          return true;
        }
        return !hiddenPanelOptions.includes(panelFilterOption);
      }),
    }));
  }

  return panels;
}
