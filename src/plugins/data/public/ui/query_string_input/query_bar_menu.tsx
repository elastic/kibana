/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useEffect } from 'react';

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  useGeneratedHtmlId,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter, Query, enableFilter, disableFilter, toggleFilterNegated } from '@kbn/es-query';
import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '../../../../kibana_react/public';
import { KIBANA_USER_QUERY_LANGUAGE_KEY, UI_SETTINGS } from '../../../common';
import { IDataPluginServices } from '../../types';
import { TimeRange, SavedQueryService, SavedQuery } from '../..';
import { KibanaReactContextValue } from '../../../../kibana_react/public';
import { QueryLanguageSwitcher } from '../query_string_input/language_switcher';

interface Props {
  language: string;
  onQueryChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  toggleFilterBarMenuPopover: (value: boolean) => void;
  openQueryBarMenu: boolean;
  nonKqlMode?: 'lucene' | 'text';
  nonKqlModeHelpText?: string;
  services: KibanaReactContextValue<IDataPluginServices>['services'];
  dateRangeFrom?: string;
  dateRangeTo?: string;
  savedQueryService: SavedQueryService;
  applySelectedQuery: (selectedSavedQuery: SavedQuery) => void;
  saveQueryFormComponent?: JSX.Element;
  onFiltersUpdated?: (filters: Filter[]) => void;
  filters?: Filter[];
}

export function QueryBarMenu({
  language,
  nonKqlMode,
  nonKqlModeHelpText,
  services,
  dateRangeFrom,
  dateRangeTo,
  onQueryChange,
  savedQueryService,
  applySelectedQuery,
  saveQueryFormComponent,
  openQueryBarMenu,
  toggleFilterBarMenuPopover,
  onFiltersUpdated,
  filters,
}: Props) {
  const [savedQueries, setSavedQueries] = useState([] as SavedQuery[]);
  const cancelPendingListingRequest = useRef<() => void>(() => {});
  const kibana = useKibana<IDataPluginServices>();
  const { appName, usageCollection } = kibana.services;
  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);

  useEffect(() => {
    const fetchSavedSearched = async () => {
      cancelPendingListingRequest.current();
      let requestGotCancelled = false;
      cancelPendingListingRequest.current = () => {
        requestGotCancelled = true;
      };

      const { queries: savedQueryItems } = await savedQueryService.findSavedQueries('');

      if (requestGotCancelled) return;

      setSavedQueries(savedQueryItems.reverse().slice(0, 5));
    };
    if (openQueryBarMenu) {
      fetchSavedSearched();
    }
  }, [openQueryBarMenu, savedQueryService]);

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'normalContextMenuPopover',
  });
  const onButtonClick = () => {
    toggleFilterBarMenuPopover(!openQueryBarMenu);
  };

  const closePopover = () => {
    toggleFilterBarMenuPopover(false);
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
  };

  const luceneLabel = i18n.translate('data.query.queryBar.luceneLanguageName', {
    defaultMessage: 'Lucene',
  });
  const kqlLabel = i18n.translate('data.query.queryBar.kqlLanguageName', {
    defaultMessage: 'KQL',
  });

  const recentSavedQueriesPanels = savedQueries.map((savedQuery) => {
    return {
      id: savedQuery.id,
      name: savedQuery.attributes.title,
      icon: 'timefilter' in savedQuery.attributes ? 'calendar' : undefined,
      onClick: () => {
        closePopover();
        applySelectedQuery(savedQuery);
      },
    };
  }) as unknown as EuiContextMenuPanelItemDescriptor[];

  const panels = [
    {
      id: 0,
      title: savedQueries.length ? 'Recently used' : undefined,
      items: [
        {
          name: i18n.translate('data.filter.options.saveCurrentFilterSetLabel', {
            defaultMessage: 'Save current filter set',
          }),
          icon: 'save',
          panel: 1,
        },
        {
          name: i18n.translate('data.filter.options.applyAllFiltersButtonLabel', {
            defaultMessage: 'Apply to all',
          }),
          icon: 'filter',
          panel: 2,
        },
        {
          name: i18n.translate('data.filter.options.clearllFiltersButtonLabel', {
            defaultMessage: 'Clear all',
          }),
          icon: 'crossInACircleFilled',
          onClick: () => {
            closePopover();
            onQueryStringChange('');
            onRemoveAll();
          },
        },
        { isSeparator: true },
        {
          name: `Language: ${language === 'kuery' ? kqlLabel : luceneLabel}`,
          panel: 3,
        },
      ],
    },
    {
      id: 1,
      title: i18n.translate('data.filter.options.saveCurrentFilterSetLabel', {
        defaultMessage: 'Save current filter set',
      }),
      content: <div style={{ padding: 16 }}>{saveQueryFormComponent}</div>,
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
        />
      ),
    },
  ] as EuiContextMenuPanelDescriptor[];

  if (savedQueries.length) {
    panels[0].items?.unshift(
      ...recentSavedQueriesPanels,
      {
        name: 'Load filter set...',
        onClick: () => {
          closePopover();
        },
      },
      { isSeparator: true }
    );
  }

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

  return (
    <React.Fragment>
      <EuiPopover
        id={normalContextMenuPopoverId}
        button={button}
        isOpen={openQueryBarMenu}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="rightUp"
        repositionOnScroll
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </React.Fragment>
  );
}
