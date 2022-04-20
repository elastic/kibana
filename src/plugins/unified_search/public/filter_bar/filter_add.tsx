/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexItem, EuiPopover } from '@elastic/eui';
import { buildEmptyFilter, Filter } from '@kbn/es-query';
import React, { useState } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { IDataPluginServices } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { FILTER_EDITOR_WIDTH } from './filter_item';
import { FilterEditor } from './filter_editor';

export interface Props {
  dataViews: DataView[];
  renderButton: (onClick: () => void) => JSX.Element;
  onAdd: (filter: Filter) => void;
  timeRangeForSuggestionsOverride?: boolean;
}

export const FilterAdd = (props: Props) => {
  const kibana = useKibana<IDataPluginServices>();
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const { uiSettings } = kibana.services;

  const isPinned = uiSettings!.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT);
  const [indexPattern] = props.dataViews;
  const index = indexPattern && indexPattern.id;
  const newFilter = buildEmptyFilter(isPinned, index);

  const onAddFilter = (filter: Filter) => {
    setIsAddFilterPopoverOpen(false);
    props.onAdd(filter);
  };

  const onAddFilterClick = () => setIsAddFilterPopoverOpen(!isAddFilterPopoverOpen);

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        id="addFilterPopover"
        button={props.renderButton(onAddFilterClick)}
        isOpen={isAddFilterPopoverOpen}
        closePopover={() => setIsAddFilterPopoverOpen(false)}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        initialFocus=".filterEditor__hiddenItem"
        display="block"
        ownFocus
        repositionOnScroll
      >
        <EuiFlexItem grow={false}>
          <div style={{ width: FILTER_EDITOR_WIDTH, maxWidth: '100%' }}>
            <FilterEditor
              filter={newFilter}
              indexPatterns={props.dataViews}
              onSubmit={onAddFilter}
              onCancel={() => setIsAddFilterPopoverOpen(false)}
              key={JSON.stringify(newFilter)}
              timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
            />
          </div>
        </EuiFlexItem>
      </EuiPopover>
    </EuiFlexItem>
  );
};

// eslint-disable-next-line import/no-default-export
export default FilterAdd;
