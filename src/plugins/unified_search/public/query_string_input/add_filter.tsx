/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiButtonIcon, EuiPopover } from '@elastic/eui';
import { Filter, buildEmptyFilter } from '@kbn/es-query';
import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '../../../kibana_react/public';
import { UI_SETTINGS } from '../../../data/common';
import { IDataPluginServices } from '../../../data/public';
import type { DataView } from '../../../data_views/public';
import { FILTER_EDITOR_WIDTH } from '../filter_bar/filter_item';
import { FilterEditor } from '../filter_bar/filter_editor';
import { fetchIndexPatterns } from './fetch_index_patterns';

interface AddFilterPopoverProps {
  indexPatterns?: Array<DataView | string>;
  filters: Filter[];
  timeRangeForSuggestionsOverride?: boolean;
  onFiltersUpdated?: (filters: Filter[]) => void;
}

export const AddFilterPopover = React.memo(function AddFilterPopover({
  indexPatterns,
  filters,
  timeRangeForSuggestionsOverride,
  onFiltersUpdated,
}: AddFilterPopoverProps) {
  const kibana = useKibana<IDataPluginServices>();
  const { uiSettings, data, usageCollection, appName } = kibana.services;
  const reportUiCounter = usageCollection?.reportUiCounter.bind(usageCollection, appName);
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const [dataViews, setDataviews] = useState<DataView[]>([]);
  const isPinned = uiSettings!.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT);
  const [dataView] = dataViews;
  const index = dataView && dataView.id;
  const newFilter = buildEmptyFilter(isPinned, index);

  useEffect(() => {
    const fetchDataViews = async () => {
      const stringPatterns = indexPatterns?.filter(
        (indexPattern) => typeof indexPattern === 'string'
      ) as string[];
      const objectPatterns = indexPatterns?.filter(
        (indexPattern) => typeof indexPattern !== 'string'
      ) as DataView[];

      const objectPatternsFromStrings = (await fetchIndexPatterns(
        data.dataViews,
        stringPatterns
      )) as DataView[];
      setDataviews([...objectPatterns, ...objectPatternsFromStrings]);
    };
    if (indexPatterns) {
      fetchDataViews();
    }
  }, [data.dataViews, indexPatterns]);

  function onAdd(filter: Filter) {
    reportUiCounter?.(METRIC_TYPE.CLICK, `filter:added`);
    setIsAddFilterPopoverOpen(false);
    const updatedFilters = [...filters, filter];
    onFiltersUpdated?.(updatedFilters);
  }

  const button = (
    <EuiButtonIcon
      display="base"
      iconType="plusInCircleFilled"
      aria-label={i18n.translate('unifiedSearch.filter.filterBar.addFilterButtonLabel', {
        defaultMessage: 'Add filter',
      })}
      data-test-subj="addFilter"
      onClick={() => setIsAddFilterPopoverOpen(!isAddFilterPopoverOpen)}
      size="m"
    />
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        id="addFilterPopover"
        button={button}
        isOpen={isAddFilterPopoverOpen}
        closePopover={() => setIsAddFilterPopoverOpen(false)}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        initialFocus=".filterEditor__hiddenItem"
        ownFocus
        repositionOnScroll
      >
        <EuiFlexItem grow={false}>
          <div style={{ width: FILTER_EDITOR_WIDTH, maxWidth: '100%' }}>
            <FilterEditor
              filter={newFilter}
              indexPatterns={dataViews}
              onSubmit={onAdd}
              onCancel={() => setIsAddFilterPopoverOpen(false)}
              key={JSON.stringify(newFilter)}
              timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            />
          </div>
        </EuiFlexItem>
      </EuiPopover>
    </EuiFlexItem>
  );
});
