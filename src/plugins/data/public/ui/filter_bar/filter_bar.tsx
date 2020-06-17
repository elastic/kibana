/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import classNames from 'classnames';
import React, { useState } from 'react';

import { FilterEditor } from './filter_editor';
import { FilterItem } from './filter_item';
import { FilterOptions } from './filter_options';
import { useKibana } from '../../../../kibana_react/public';
import { IIndexPattern } from '../..';
import {
  buildEmptyFilter,
  Filter,
  enableFilter,
  disableFilter,
  pinFilter,
  toggleFilterDisabled,
  toggleFilterNegated,
  unpinFilter,
  UI_SETTINGS,
} from '../../../common';

interface Props {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className: string;
  indexPatterns: IIndexPattern[];
  intl: InjectedIntl;
}

function FilterBarUI(props: Props) {
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const kibana = useKibana();

  const uiSettings = kibana.services.uiSettings;
  if (!uiSettings) return null;

  function onFiltersUpdated(filters: Filter[]) {
    if (props.onFiltersUpdated) {
      props.onFiltersUpdated(filters);
    }
  }

  function renderItems() {
    return props.filters.map((filter, i) => (
      <EuiFlexItem key={i} grow={false} className="globalFilterBar__flexItem">
        <FilterItem
          id={`${i}`}
          intl={props.intl}
          filter={filter}
          onUpdate={(newFilter) => onUpdate(i, newFilter)}
          onRemove={() => onRemove(i)}
          indexPatterns={props.indexPatterns}
          uiSettings={uiSettings!}
        />
      </EuiFlexItem>
    ));
  }

  function renderAddFilter() {
    const isPinned = uiSettings!.get(UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT);
    const [indexPattern] = props.indexPatterns;
    const index = indexPattern && indexPattern.id;
    const newFilter = buildEmptyFilter(isPinned, index);

    const button = (
      <EuiButtonEmpty
        size="xs"
        onClick={() => setIsAddFilterPopoverOpen(true)}
        data-test-subj="addFilter"
        className="globalFilterBar__addButton"
      >
        +{' '}
        <FormattedMessage
          id="data.filter.filterBar.addFilterButtonLabel"
          defaultMessage="Add filter"
        />
      </EuiButtonEmpty>
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="addFilterPopover"
          button={button}
          isOpen={isAddFilterPopoverOpen}
          closePopover={() => setIsAddFilterPopoverOpen(false)}
          anchorPosition="downLeft"
          withTitle
          panelPaddingSize="none"
          ownFocus={true}
          initialFocus=".filterEditor__hiddenItem"
          repositionOnScroll
        >
          <EuiFlexItem grow={false}>
            <div style={{ width: 400 }}>
              <FilterEditor
                filter={newFilter}
                indexPatterns={props.indexPatterns}
                onSubmit={onAdd}
                onCancel={() => setIsAddFilterPopoverOpen(false)}
                key={JSON.stringify(newFilter)}
              />
            </div>
          </EuiFlexItem>
        </EuiPopover>
      </EuiFlexItem>
    );
  }

  function onAdd(filter: Filter) {
    setIsAddFilterPopoverOpen(false);
    const filters = [...props.filters, filter];
    onFiltersUpdated(filters);
  }

  function onRemove(i: number) {
    const filters = [...props.filters];
    filters.splice(i, 1);
    onFiltersUpdated(filters);
  }

  function onUpdate(i: number, filter: Filter) {
    const filters = [...props.filters];
    filters[i] = filter;
    onFiltersUpdated(filters);
  }

  function onEnableAll() {
    const filters = props.filters.map(enableFilter);
    onFiltersUpdated(filters);
  }

  function onDisableAll() {
    const filters = props.filters.map(disableFilter);
    onFiltersUpdated(filters);
  }

  function onPinAll() {
    const filters = props.filters.map(pinFilter);
    onFiltersUpdated(filters);
  }

  function onUnpinAll() {
    const filters = props.filters.map(unpinFilter);
    onFiltersUpdated(filters);
  }

  function onToggleAllNegated() {
    const filters = props.filters.map(toggleFilterNegated);
    onFiltersUpdated(filters);
  }

  function onToggleAllDisabled() {
    const filters = props.filters.map(toggleFilterDisabled);
    onFiltersUpdated(filters);
  }

  function onRemoveAll() {
    onFiltersUpdated([]);
  }

  const classes = classNames('globalFilterBar', props.className);

  return (
    <EuiFlexGroup
      className="globalFilterGroup"
      gutterSize="none"
      alignItems="flexStart"
      responsive={false}
    >
      <EuiFlexItem className="globalFilterGroup__branch" grow={false}>
        <FilterOptions
          onEnableAll={onEnableAll}
          onDisableAll={onDisableAll}
          onPinAll={onPinAll}
          onUnpinAll={onUnpinAll}
          onToggleAllNegated={onToggleAllNegated}
          onToggleAllDisabled={onToggleAllDisabled}
          onRemoveAll={onRemoveAll}
        />
      </EuiFlexItem>

      <EuiFlexItem className="globalFilterGroup__filterFlexItem">
        <EuiFlexGroup
          className={classes}
          wrap={true}
          responsive={false}
          gutterSize="xs"
          alignItems="center"
        >
          {renderItems()}
          {renderAddFilter()}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const FilterBar = injectI18n(FilterBarUI);
