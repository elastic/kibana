/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  EuiContextMenuPanelDescriptor,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import {
  Filter,
  Query,
  enableFilter,
  disableFilter,
  toggleFilterNegated,
  pinFilter,
  unpinFilter,
} from '@kbn/es-query';
import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '../../../../kibana_react/public';
import { KIBANA_USER_QUERY_LANGUAGE_KEY, UI_SETTINGS } from '../../../common';
import type { IDataPluginServices } from '../../types';
import type { TimeRange, SavedQueryService, SavedQuery } from '../..';
import { fromUser } from '../../query';
import { QueryLanguageSwitcher } from '../query_string_input/language_switcher';

interface QueryBarMenuPanelProps {
  filters?: Filter[];
  savedQuery?: SavedQuery;
  language: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  query?: Query;
  showSaveQuery?: boolean;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  savedQueryService: SavedQueryService;
  saveAsNewQueryFormComponent?: JSX.Element;
  manageFilterSetComponent?: JSX.Element;
  nonKqlMode?: 'lucene' | 'text';
  closePopover: () => void;
  onQueryBarSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
  onClearSavedQuery?: () => void;
  onQueryChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  setRenderedComponent: (component: string) => void;
}

export function QueryBarMenuPanels({
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
}: QueryBarMenuPanelProps) {
  const kibana = useKibana<IDataPluginServices>();
  const { appName, usageCollection, uiSettings, http, storage } = kibana.services;
  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);
  const cancelPendingListingRequest = useRef<() => void>(() => {});

  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [hasFiltersOrQuery, setHasFiltersOrQuery] = useState(false);
  const [savedQueryHasChanged, setSavedQueryHasChanged] = useState(false);

  useEffect(() => {
    const fetchSavedQueries = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { queries: savedQueryItems } = await savedQueryService.findSavedQueries('');

      if (requestGotCancelled) return;

      setSavedQueries(savedQueryItems.reverse().slice(0, 5));
    };
    if (showQueryInput && showFilterBar) {
      fetchSavedQueries();
    }
  }, [savedQueryService, savedQuery, showQueryInput, showFilterBar]);

  useEffect(() => {
    if (savedQuery) {
      let filtersHaveChanged = filters?.length !== savedQuery.attributes?.filters?.length;
      if (filters?.length === savedQuery.attributes?.filters?.length) {
        filtersHaveChanged = Boolean(
          filters?.some(
            (filter, index) =>
              !isEqual(filter.query, savedQuery.attributes?.filters?.[index]?.query)
          )
        );
      }
      if (filtersHaveChanged || !isEqual(query, savedQuery?.attributes.query)) {
        setSavedQueryHasChanged(true);
      } else {
        setSavedQueryHasChanged(false);
      }
    }
  }, [filters, query, savedQuery, savedQuery?.attributes.filters, savedQuery?.attributes.query]);

  useEffect(() => {
    const hasFilters = Boolean(filters && filters.length > 0);
    const hasQuery = Boolean(query && query.query);
    setHasFiltersOrQuery(hasFilters || hasQuery);
  }, [filters, query]);

  const getDateRange = () => {
    const defaultTimeSetting = uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
    return {
      from: dateRangeFrom || defaultTimeSetting.from,
      to: dateRangeTo || defaultTimeSetting.to,
    };
  };

  const handleSaveAsNew = useCallback(() => {
    setRenderedComponent('saveAsNewForm');
  }, [setRenderedComponent]);

  const handleSave = useCallback(() => {
    setRenderedComponent('saveForm');
  }, [setRenderedComponent]);

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
    http.post('/api/kibana/kql_opt_in_stats', {
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

  const luceneLabel = i18n.translate('data.query.queryBar.luceneLanguageName', {
    defaultMessage: 'Lucene',
  });
  const kqlLabel = i18n.translate('data.query.queryBar.kqlLanguageName', {
    defaultMessage: 'KQL',
  });

  const filtersRelatedPanels = [
    {
      name: i18n.translate('data.filter.options.applyAllFiltersButtonLabel', {
        defaultMessage: 'Apply to all',
      }),
      icon: 'filter',
      panel: 2,
      disabled: !Boolean(filters && filters.length > 0),
      'data-test-subj': 'filter-sets-applyToAllFilters',
    },
  ];

  const queryAndFiltersRelatedPanels = [
    {
      name: savedQuery
        ? i18n.translate('data.filter.options.loadOtherFilterSetLabel', {
            defaultMessage: 'Load other filter set',
          })
        : i18n.translate('data.filter.options.loadCurrentFilterSetLabel', {
            defaultMessage: 'Load filter set',
          }),
      panel: 4,
      width: 350,
      icon: 'filter',
      'data-test-subj': 'saved-query-management-load-button',
      disabled: !savedQueries.length,
    },
    {
      name: savedQuery
        ? i18n.translate('data.filter.options.saveAsNewFilterSetLabel', {
            defaultMessage: 'Save as new',
          })
        : i18n.translate('data.filter.options.saveFilterSetLabel', {
            defaultMessage: 'Save filter set',
          }),
      icon: 'save',
      disabled:
        !Boolean(showSaveQuery) || !hasFiltersOrQuery || (savedQuery && !savedQueryHasChanged),
      panel: 1,
      'data-test-subj': 'saved-query-management-save-button',
    },
    { isSeparator: true },
  ];

  const items = [];
  // apply to all actions are only shown when there are filters
  if (showFilterBar) {
    items.push(...filtersRelatedPanels);
  }
  // clear all actions are only shown when there are filters or query
  if (showFilterBar || showQueryInput) {
    items.push(
      {
        name: i18n.translate('data.filter.options.clearllFiltersButtonLabel', {
          defaultMessage: 'Clear all',
        }),
        disabled: !hasFiltersOrQuery && !Boolean(savedQuery),
        icon: 'crossInACircleFilled',
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
  // saved queries actions are only shown when the showQueryInput and showFilterBar is true
  if (showQueryInput && showFilterBar) {
    items.push(...queryAndFiltersRelatedPanels);
  }

  // language menu appears when the showQueryInput is true
  if (showQueryInput) {
    items.push({
      name: `Language: ${language === 'kuery' ? kqlLabel : luceneLabel}`,
      panel: 3,
      'data-test-subj': 'switchQueryLanguageButton',
    });
  }

  const panels = [
    {
      id: 0,
      title: (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText
                color={savedQuery ? 'primary' : 'default'}
                size="s"
                data-test-subj="savedQueryTitle"
              >
                <strong>{savedQuery ? savedQuery.attributes.title : 'Filter set'}</strong>
              </EuiText>
            </EuiFlexItem>
            {savedQuery && savedQueryHasChanged && Boolean(showSaveQuery) && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  direction="row"
                  gutterSize="s"
                  alignItems="center"
                  justifyContent="center"
                  responsive={false}
                  wrap={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      fill
                      onClick={handleSave}
                      aria-label={i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel',
                        {
                          defaultMessage: 'Save changes to {title}',
                          values: { title: savedQuery?.attributes.title },
                        }
                      )}
                      data-test-subj="saved-query-management-save-changes-button"
                    >
                      {i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveChangesButtonText',
                        {
                          defaultMessage: 'Save changes',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      onClick={handleSaveAsNew}
                      aria-label={i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel',
                        {
                          defaultMessage: 'Save as new saved query',
                        }
                      )}
                      data-test-subj="saved-query-management-save-as-new-button"
                    >
                      {i18n.translate(
                        'data.search.searchBar.savedQueryPopoverSaveAsNewButtonText',
                        {
                          defaultMessage: 'Save as new',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      ),
      items,
    },
    {
      id: 1,
      title: i18n.translate('data.filter.options.saveCurrentFilterSetLabel', {
        defaultMessage: 'Save current filter set',
      }),
      disabled: !Boolean(showSaveQuery),
      content: <div style={{ padding: 16 }}>{saveAsNewQueryFormComponent}</div>,
    },
    {
      id: 2,
      initialFocusedItemIndex: 1,
      title: i18n.translate('data.filter.options.applyAllFiltersButtonLabel', {
        defaultMessage: 'Apply to all',
      }),
      items: [
        {
          name: i18n.translate('data.filter.options.enableAllFiltersButtonLabel', {
            defaultMessage: 'Enable all',
          }),
          icon: 'eye',
          'data-test-subj': 'filter-sets-enableAllFilters',
          onClick: () => {
            closePopover();
            onEnableAll();
          },
        },
        {
          name: i18n.translate('data.filter.options.disableAllFiltersButtonLabel', {
            defaultMessage: 'Disable all',
          }),
          'data-test-subj': 'filter-sets-disableAllFilters',
          icon: 'eyeClosed',
          onClick: () => {
            closePopover();
            onDisableAll();
          },
        },
        {
          name: i18n.translate('data.filter.options.invertNegatedFiltersButtonLabel', {
            defaultMessage: 'Invert inclusion',
          }),
          'data-test-subj': 'filter-sets-invertAllFilters',
          icon: 'invert',
          onClick: () => {
            closePopover();
            onToggleAllNegated();
          },
        },
        {
          name: i18n.translate('data.filter.options.pinAllFiltersButtonLabel', {
            defaultMessage: 'Pin all',
          }),
          'data-test-subj': 'filter-sets-pinAllFilters',
          icon: 'pin',
          onClick: () => {
            closePopover();
            onPinAll();
          },
        },
        {
          name: i18n.translate('data.filter.options.unpinAllFiltersButtonLabel', {
            defaultMessage: 'Unpin all',
          }),
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
      id: 3,
      title: i18n.translate('data.filter.options.filterLanguageLabel', {
        defaultMessage: 'Filter language',
      }),
      content: (
        <QueryLanguageSwitcher
          language={language}
          onSelectLanguage={onSelectLanguage}
          nonKqlMode={nonKqlMode}
          isOnMenu={true}
        />
      ),
    },
    {
      id: 4,
      title: i18n.translate('data.filter.options.loadCurrentFilterSetLabel', {
        defaultMessage: 'Load filter set',
      }),
      width: 400,
      content: <div>{manageFilterSetComponent}</div>,
    },
  ] as EuiContextMenuPanelDescriptor[];

  return panels;
}
