/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSelectableOption, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback } from 'react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { getESQLSources } from '@kbn/esql-utils';
import type { CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import { BrowserPopoverWrapper } from './browser_popover_wrapper';

const getSourceTypeLabel = (type?: string): string => {
  if (!type) return 'Index';
  const typeLower = type.toLowerCase();
  if (typeLower.includes('index') && !typeLower.includes('lookup')) return 'Index';
  if (typeLower.includes('alias')) return 'Alias';
  if (typeLower.includes('stream') || typeLower.includes('data stream')) return 'Stream';
  if (typeLower.includes('integration')) return 'Integration';
  if (typeLower.includes('lookup')) return 'Lookup Index';
  if (typeLower.includes('timeseries') || typeLower.includes('time series')) return 'Timeseries';
  return type;
};

const getSourceTypeKey = (type?: string): string => {
  if (!type) return 'index';
  const typeLower = type.toLowerCase();
  if (typeLower.includes('index') && !typeLower.includes('lookup')) return 'index';
  if (typeLower.includes('alias')) return 'alias';
  if (typeLower.includes('stream') || typeLower.includes('data stream')) return 'stream';
  if (typeLower.includes('integration')) return 'integration';
  if (typeLower.includes('lookup')) return 'lookup_index';
  if (typeLower.includes('timeseries') || typeLower.includes('time series')) return 'timeseries';
  return 'index';
};

interface IndicesBrowserPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (indexName: string, oldLength: number) => void;
  core: CoreStart;
  getLicense?: () => Promise<ILicense | undefined>;
  anchorElement?: HTMLElement;
  position?: { top?: number; left?: number };
}

export const IndicesBrowserPopover: React.FC<IndicesBrowserPopoverProps> = ({
  isOpen,
  onClose,
  onSelectIndex,
  core,
  getLicense,
  anchorElement,
  position,
}) => {
  const fetchData = useCallback(async () => {
    return getESQLSources(core, getLicense);
  }, [core, getLicense]);

  const getTypeKey = useCallback((source: ESQLSourceResult) => {
    return getSourceTypeKey(source.type);
  }, []);

  const getTypeLabel = useCallback((typeKey: string) => {
    return getSourceTypeLabel(typeKey);
  }, []);

  const createOptions = useCallback(
    (sources: ESQLSourceResult[], selectedIndices: string[]): EuiSelectableOption[] => {
      return sources.map((source) => ({
        key: source.name,
        label: source.name,
        checked: selectedIndices.includes(source.name) ? ('on' as const) : undefined,
        append: (
          <EuiText size="xs" color="subdued">
            {getSourceTypeLabel(source.type)}
          </EuiText>
        ),
        data: {
          type: source.type,
          typeKey: getSourceTypeKey(source.type),
        },
      }));
    },
    []
  );

  const i18nKeys = useMemo(
    () => ({
      title: i18n.translate('esqlEditor.indicesBrowser.title', {
        defaultMessage: 'Data sources',
      }),
      searchPlaceholder: i18n.translate('esqlEditor.indicesBrowser.searchPlaceholder', {
        defaultMessage: 'Search indices, aliases, data streams...',
      }),
      filterTitle: i18n.translate('esqlEditor.indicesBrowser.filterTitle', {
        defaultMessage: 'Filter by data source',
      }),
      filterSearchPlaceholder: i18n.translate(
        'esqlEditor.indicesBrowser.filterSearchPlaceholder',
        {
          defaultMessage: 'Search types',
        }
      ),
      filterByType: i18n.translate('esqlEditor.indicesBrowser.filterByType', {
        defaultMessage: 'Filter by data source',
      }),
      closeLabel: i18n.translate('esqlEditor.indicesBrowser.closeLabel', {
        defaultMessage: 'Close',
      }),
      loading: i18n.translate('esqlEditor.indicesBrowser.loading', {
        defaultMessage: 'Loading data srources...',
      }),
      empty: i18n.translate('esqlEditor.indicesBrowser.empty', {
        defaultMessage: 'No data sources found',
      }),
      noMatches: i18n.translate('esqlEditor.indicesBrowser.noMatches', {
        defaultMessage: 'No data sources match your search',
      }),
    }),
    []
  );

  return (
    <BrowserPopoverWrapper
      isOpen={isOpen}
      onClose={onClose}
      onSelect={onSelectIndex}
      anchorElement={anchorElement}
      position={position}
      fetchData={fetchData}
      getTypeKey={getTypeKey}
      getTypeLabel={getTypeLabel}
      createOptions={createOptions}
      i18nKeys={i18nKeys}
    />
  );
};

