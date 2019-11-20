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
import { CoreStart } from 'src/core/public';
import { IndexPattern } from '../../index_patterns';
import { FilterEditor } from './filter_editor';
import { FilterItem } from './filter_item';
import { FilterOptions } from './filter_options';
import { useKibana, KibanaContextProvider } from '../../../../../../plugins/kibana_react/public';
import { DataPublicPluginStart, esFilters } from '../../../../../../plugins/data/public';

interface Props {
  filters: esFilters.Filter[];
  onFiltersUpdated?: (filters: esFilters.Filter[]) => void;
  className: string;
  indexPatterns: IndexPattern[];
  intl: InjectedIntl;

  // TODO: Only for filter-bar directive!
  uiSettings?: CoreStart['uiSettings'];
  docLinks?: CoreStart['docLinks'];
  pluginDataStart?: DataPublicPluginStart;
}

function FilterBarUI(props: Props) {
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);
  const kibana = useKibana();

  const uiSettings = kibana.services.uiSettings || props.uiSettings;
  if (!uiSettings) return null;

  function hasContext() {
    return Boolean(kibana.services.uiSettings);
  }

  function wrapInContextIfMissing(content: JSX.Element) {
    // TODO: Relevant only as long as directives are used!
    if (!hasContext()) {
      if (props.docLinks && props.uiSettings && props.pluginDataStart) {
        return (
          <KibanaContextProvider
            services={{
              uiSettings: props.uiSettings,
              docLinks: props.docLinks,
              data: props.pluginDataStart,
            }}
          >
            {content}
          </KibanaContextProvider>
        );
      } else {
        throw new Error(
          'Rending filter bar requires providing sufficient context: uiSettings, docLinks and NP data plugin'
        );
      }
    }
    return content;
  }

  function onFiltersUpdated(filters: esFilters.Filter[]) {
    if (props.onFiltersUpdated) {
      props.onFiltersUpdated(filters);
    }
  }

  function renderItems() {
    return props.filters.map((filter, i) => (
      <EuiFlexItem key={i} grow={false} className="globalFilterBar__flexItem">
        <FilterItem
          id={`${i}`}
          filter={filter}
          onUpdate={newFilter => onUpdate(i, newFilter)}
          onRemove={() => onRemove(i)}
          indexPatterns={props.indexPatterns}
          uiSettings={uiSettings!}
        />
      </EuiFlexItem>
    ));
  }

  function renderAddFilter() {
    const isPinned = uiSettings!.get('filters:pinnedByDefault');
    const [indexPattern] = props.indexPatterns;
    const index = indexPattern && indexPattern.id;
    const newFilter = esFilters.buildEmptyFilter(isPinned, index);

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

    return wrapInContextIfMissing(
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

  function onAdd(filter: esFilters.Filter) {
    setIsAddFilterPopoverOpen(false);
    const filters = [...props.filters, filter];
    onFiltersUpdated(filters);
  }

  function onRemove(i: number) {
    const filters = [...props.filters];
    filters.splice(i, 1);
    onFiltersUpdated(filters);
  }

  function onUpdate(i: number, filter: esFilters.Filter) {
    const filters = [...props.filters];
    filters[i] = filter;
    onFiltersUpdated(filters);
  }

  function onEnableAll() {
    const filters = props.filters.map(esFilters.enableFilter);
    onFiltersUpdated(filters);
  }

  function onDisableAll() {
    const filters = props.filters.map(esFilters.disableFilter);
    onFiltersUpdated(filters);
  }

  function onPinAll() {
    const filters = props.filters.map(esFilters.pinFilter);
    onFiltersUpdated(filters);
  }

  function onUnpinAll() {
    const filters = props.filters.map(esFilters.unpinFilter);
    onFiltersUpdated(filters);
  }

  function onToggleAllNegated() {
    const filters = props.filters.map(esFilters.toggleFilterNegated);
    onFiltersUpdated(filters);
  }

  function onToggleAllDisabled() {
    const filters = props.filters.map(esFilters.toggleFilterDisabled);
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
