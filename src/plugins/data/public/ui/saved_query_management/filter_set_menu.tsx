/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
  toSentenceCase,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KIBANA_USER_QUERY_LANGUAGE_KEY, UI_SETTINGS } from '../../../common';
import { IDataPluginServices } from '../../types';
import { TimeRange, Query } from '../..';
import { KibanaReactContextValue } from '../../../../kibana_react/public';
import { QueryLanguageSwitcher } from '../query_string_input/language_switcher';

interface Props {
  language: string;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onToggleAllNegated: () => void;
  onRemoveAll: () => void;
  onSaveQuery: () => void;
  onLanguageChange: (payload: { dateRange: TimeRange; query?: Query }) => void;
  nonKqlMode?: 'lucene' | 'text';
  nonKqlModeHelpText?: string;
  services: KibanaReactContextValue<IDataPluginServices>['services'];
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

export function FilterSetMenu({
  language,
  nonKqlMode,
  nonKqlModeHelpText,
  services,
  dateRangeFrom,
  dateRangeTo,
  onEnableAll,
  onDisableAll,
  onToggleAllNegated,
  onRemoveAll,
  onSaveQuery,
  onLanguageChange,
}: Props) {
  const [isPopoverOpen, setPopover] = useState(false);

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'normalContextMenuPopover',
  });
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const getDateRange = () => {
    const defaultTimeSetting = services.uiSettings!.get(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
    return {
      from: dateRangeFrom || defaultTimeSetting.from,
      to: dateRangeTo || defaultTimeSetting.to,
    };
  };

  const onSelectLanguage = (lang: string) => {
    services.http.post('/api/kibana/kql_opt_in_stats', {
      body: JSON.stringify({ opt_in: lang === 'kuery' }),
    });

    const storageKey = KIBANA_USER_QUERY_LANGUAGE_KEY;
    services.storage.set(storageKey!, lang);

    const newQuery = { query: '', language: lang };
    onLanguageChange({
      query: newQuery,
      dateRange: getDateRange(),
    });
  };

  const luceneLabel = i18n.translate('data.query.queryBar.luceneLanguageName', {
    defaultMessage: 'Lucene',
  });
  const kqlLabel = i18n.translate('data.query.queryBar.kqlLanguageName', {
    defaultMessage: 'KQL',
  });

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Load filter set...',
          onClick: () => {
            closePopover();
          },
        },
        { isSeparator: true },
        {
          name: i18n.translate('data.filter.options.saveCurrentFilterSetLabel', {
            defaultMessage: 'Save current filter set',
          }),
          icon: 'save',
          panel: 1,
        },
        {
          name: 'Inspect current filter set...',
          icon: 'inspect',
          disabled: true,
          onClick: () => {
            closePopover();
          },
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
      content: (
        <div style={{ padding: 16 }}>
          <EuiButton fill onClick={onSaveQuery}>
            Save
          </EuiButton>
        </div>
      ),
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

  const buttonLabel = i18n.translate('data.filter.options.filterSetButtonLabel', {
    defaultMessage: 'Filter set menu',
  });

  const button = (
    <EuiButtonIcon
      onClick={onButtonClick}
      iconType="filter"
      aria-label={buttonLabel}
      title={buttonLabel}
      data-test-subj="showFilterSetMenu"
    />
  );

  return (
    <React.Fragment>
      <EuiPopover
        id={normalContextMenuPopoverId}
        button={button}
        isOpen={isPopoverOpen}
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
