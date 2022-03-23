/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { isEqual } from 'lodash';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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
import { IDataPluginServices } from '../../types';
import { fromUser } from '../../query';
import { TimeRange, SavedQueryService, SavedQuery } from '../..';
import { KibanaReactContextValue } from '../../../../kibana_react/public';
import { QueryLanguageSwitcher } from '../query_string_input/language_switcher';

interface Props {
  language: string;
  onQueryChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onQueryBarSubmit: (payload: { dateRange: TimeRange; query?: Query }) => void;
  toggleFilterBarMenuPopover: (value: boolean) => void;
  openQueryBarMenu: boolean;
  nonKqlMode?: 'lucene' | 'text';
  nonKqlModeHelpText?: string;
  services: KibanaReactContextValue<IDataPluginServices>['services'];
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
  showSavedQueryManagement?: boolean;
  showFilterSetManagement?: boolean;
}

export function QueryBarMenu({
  language,
  nonKqlMode,
  nonKqlModeHelpText,
  services,
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
  showSavedQueryManagement,
  showFilterSetManagement,
}: Props) {
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const [hasFiltersOrQuery, setHasFiltersOrQuery] = useState(false);
  const [renderedComponent, setRenderedComponent] = useState('menu');
  const [savedQueryHasChanged, setSavedQueryHasChanged] = useState(false);
  const cancelPendingListingRequest = useRef<() => void>(() => {});
  const kibana = useKibana<IDataPluginServices>();
  const { appName, usageCollection } = kibana.services;
  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);

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
    fetchSavedQueries();
  }, [savedQueryService, savedQuery]);

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

  const handleSaveAsNew = useCallback(() => {
    setRenderedComponent('saveAsNewForm');
  }, []);

  const handleSave = useCallback(() => {
    setRenderedComponent('saveForm');
  }, []);

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

  const getDateRange = () => {
    const defaultTimeSetting = services.uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
    return {
      from: dateRangeFrom || defaultTimeSetting.from,
      to: dateRangeTo || defaultTimeSetting.to,
    };
  };

  const onQueryStringChange = (value: string) => {
    onQueryChange({
      query: { query: value, language },
      dateRange: getDateRange(),
    });
  };

  const onSelectLanguage = (lang: string) => {
    services.http.post('/api/kibana/kql_opt_in_stats', {
      body: JSON.stringify({ opt_in: lang === 'kuery' }),
    });

    const storageKey = KIBANA_USER_QUERY_LANGUAGE_KEY;
    services.storage.set(storageKey!, lang);

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

  const filterSetRelatedPanels = [
    {
      name: i18n.translate('data.filter.options.applyAllFiltersButtonLabel', {
        defaultMessage: 'Apply to all',
      }),
      icon: 'filter',
      panel: 2,
      disabled: !Boolean(filters && filters.length > 0),
    },
    {
      name: i18n.translate('data.filter.options.clearllFiltersButtonLabel', {
        defaultMessage: 'Clear all',
      }),
      disabled: !hasFiltersOrQuery && !Boolean(savedQuery),
      icon: 'crossInACircleFilled',
      'data-test-subj': 'saved-query-management-removeAllFilters',
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
    { isSeparator: true },
  ];

  const savedFilterSetRelatedPanels = [
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
      disabled: !hasFiltersOrQuery || (savedQuery && !savedQueryHasChanged),
      panel: 1,
      'data-test-subj': 'saved-query-management-save-button',
    },
    { isSeparator: true },
  ];

  const items = [];
  if (showFilterSetManagement) {
    items.push(...filterSetRelatedPanels);
  }
  if (showSavedQueryManagement) {
    items.push(...savedFilterSetRelatedPanels);
  }
  if (showFilterSetManagement && showSavedQueryManagement) {
    items.push({
      name: `Language: ${language === 'kuery' ? kqlLabel : luceneLabel}`,
      panel: 3,
    });
  }

  const panels = [
    {
      id: 0,
      title: (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText color={savedQuery ? '#0071c2' : 'default'} size="s">
                <strong>{savedQuery ? savedQuery.attributes.title : 'Filter set'}</strong>
              </EuiText>
            </EuiFlexItem>
            {savedQuery && savedQueryHasChanged && (
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
      content: <div style={{ padding: 16 }}>{saveAsNewQueryFormComponent}</div>,
    },
    {
      id: 2,
      initialFocusedItemIndex: 1,
      title: 'Apply to all',
      items: [
        {
          name: i18n.translate('data.filter.options.enableAllFiltersButtonLabel', {
            defaultMessage: 'Enable all',
          }),
          icon: 'eye',
          onClick: () => {
            closePopover();
            onEnableAll();
          },
        },
        {
          name: i18n.translate('data.filter.options.disableAllFiltersButtonLabel', {
            defaultMessage: 'Disable all',
          }),
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
      title: 'Filter language',
      content: (
        <QueryLanguageSwitcher
          language={language}
          onSelectLanguage={onSelectLanguage}
          nonKqlMode={nonKqlMode}
          nonKqlModeHelpText={nonKqlModeHelpText}
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

  const renderComponent = () => {
    switch (renderedComponent) {
      case 'menu':
      default:
        return <EuiContextMenu initialPanelId={0} panels={panels} />;
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
