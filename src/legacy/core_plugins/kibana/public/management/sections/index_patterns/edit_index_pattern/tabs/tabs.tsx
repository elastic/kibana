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

import React, { useState, useCallback, useEffect, Fragment, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiFieldSearch,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fieldWildcardMatcher } from '../../../../../../../../../plugins/kibana_utils/public';
import { IndexPatternManagementStart } from '../../../../../../../../../plugins/index_pattern_management/public';
import { IndexPattern, IndexPatternField } from '../../../../../../../../../plugins/data/public';
import { createEditIndexPatternPageStateContainer } from '../edit_index_pattern_state_container';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from '../constants';
import { SourceFiltersTable } from '../source_filters_table';
import { IndexedFieldsTable } from '../indexed_fields_table';
import { ScriptedFieldsTable } from '../scripted_fields_table';
import { getTabs, getPath, convertToEuiSelectOption } from './utils';

interface TabsProps extends Pick<RouteComponentProps, 'history' | 'location'> {
  indexPattern: IndexPattern;
  config: Record<string, any>;
  fields: IndexPatternField[];
  services: {
    indexPatternManagement: IndexPatternManagementStart;
  };
}

const filterAriaLabel = i18n.translate('kbn.management.editIndexPattern.fields.filterAria', {
  defaultMessage: 'Filter',
});

const filterPlaceholder = i18n.translate(
  'kbn.management.editIndexPattern.fields.filterPlaceholder',
  {
    defaultMessage: 'Filter',
  }
);

export function Tabs({ config, indexPattern, fields, services, history, location }: TabsProps) {
  const [fieldFilter, setFieldFilter] = useState<string>('');
  const [indexedFieldTypeFilter, setIndexedFieldTypeFilter] = useState<string>('');
  const [scriptedFieldLanguageFilter, setScriptedFieldLanguageFilter] = useState<string>('');
  const [indexedFieldTypes, setIndexedFieldType] = useState<EuiSelectOption[]>([]);
  const [scriptedFieldLanguages, setScriptedFieldLanguages] = useState<EuiSelectOption[]>([]);
  const [syncingStateFunc, setSyncingStateFunc] = useState<any>({
    getCurrentTab: () => TAB_INDEXED_FIELDS,
  });

  const refreshFilters = useCallback(() => {
    const tempIndexedFieldTypes: string[] = [];
    const tempScriptedFieldLanguages: string[] = [];
    indexPattern.fields.forEach(field => {
      if (field.scripted) {
        if (field.lang) {
          tempScriptedFieldLanguages.push(field.lang);
        }
      } else {
        tempIndexedFieldTypes.push(field.type);
      }
    });

    setIndexedFieldType(convertToEuiSelectOption(tempIndexedFieldTypes, 'indexedFiledTypes'));
    setScriptedFieldLanguages(
      convertToEuiSelectOption(tempScriptedFieldLanguages, 'scriptedFieldLanguages')
    );
  }, [indexPattern]);

  useEffect(() => {
    refreshFilters();
  }, [indexPattern, indexPattern.fields, refreshFilters]);

  const fieldWildcardMatcherDecorated = useCallback(
    (filters: string[]) => fieldWildcardMatcher(filters, config.get('metaFields')),
    [config]
  );

  const getFilterSection = useCallback(
    (type: string) => {
      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiFieldSearch
              placeholder={filterPlaceholder}
              value={fieldFilter}
              onChange={e => setFieldFilter(e.target.value)}
              data-test-subj="indexPatternFieldFilter"
              aria-label={filterAriaLabel}
            />
          </EuiFlexItem>
          {type === TAB_INDEXED_FIELDS && indexedFieldTypes.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={indexedFieldTypes}
                value={indexedFieldTypeFilter}
                onChange={e => setIndexedFieldTypeFilter(e.target.value)}
                data-test-subj="indexedFieldTypeFilterDropdown"
              />
            </EuiFlexItem>
          )}
          {type === TAB_SCRIPTED_FIELDS && scriptedFieldLanguages.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={scriptedFieldLanguages}
                value={scriptedFieldLanguageFilter}
                onChange={e => setScriptedFieldLanguageFilter(e.target.value)}
                data-test-subj="scriptedFieldLanguageFilterDropdown"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [
      fieldFilter,
      indexedFieldTypeFilter,
      indexedFieldTypes,
      scriptedFieldLanguageFilter,
      scriptedFieldLanguages,
    ]
  );

  const getContent = useCallback(
    (type: string) => {
      switch (type) {
        case TAB_INDEXED_FIELDS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <IndexedFieldsTable
                fields={fields}
                indexPattern={indexPattern}
                fieldFilter={fieldFilter}
                fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                indexedFieldTypeFilter={indexedFieldTypeFilter}
                helpers={{
                  redirectToRoute: (field: IndexPatternField) => {
                    history.push(getPath(field));
                  },
                  getFieldInfo: services.indexPatternManagement.list.getFieldInfo,
                }}
              />
            </Fragment>
          );
        case TAB_SCRIPTED_FIELDS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <ScriptedFieldsTable
                indexPattern={indexPattern}
                fieldFilter={fieldFilter}
                scriptedFieldLanguageFilter={scriptedFieldLanguageFilter}
                helpers={{
                  redirectToRoute: (field: IndexPatternField) => {
                    history.push(getPath(field));
                  },
                }}
                onRemoveField={refreshFilters}
              />
            </Fragment>
          );
        case TAB_SOURCE_FILTERS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <SourceFiltersTable
                indexPattern={indexPattern}
                filterFilter={fieldFilter}
                fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                onAddOrRemoveFilter={refreshFilters}
              />
            </Fragment>
          );
      }
    },
    [
      fieldFilter,
      fieldWildcardMatcherDecorated,
      fields,
      getFilterSection,
      history,
      indexPattern,
      indexedFieldTypeFilter,
      refreshFilters,
      scriptedFieldLanguageFilter,
      services.indexPatternManagement.list.getFieldInfo,
    ]
  );

  const euiTabs: EuiTabbedContentTab[] = useMemo(
    () =>
      getTabs(indexPattern, fieldFilter, services.indexPatternManagement.list).map(
        (tab: Pick<EuiTabbedContentTab, 'name' | 'id'>) => {
          return {
            ...tab,
            content: getContent(tab.id),
          };
        }
      ),
    [fieldFilter, getContent, indexPattern, services.indexPatternManagement.list]
  );

  const [selectedTabId, setSelectedTabId] = useState(euiTabs[0].id);

  useEffect(() => {
    const {
      startSyncingState,
      stopSyncingState,
      setCurrentTab,
      getCurrentTab,
    } = createEditIndexPatternPageStateContainer({
      useHashedUrl: config.get('state:storeInSessionStorage'),
      defaultTab: TAB_INDEXED_FIELDS,
    });

    startSyncingState();
    setSyncingStateFunc({
      setCurrentTab,
      getCurrentTab,
    });
    setSelectedTabId(getCurrentTab());

    return () => {
      stopSyncingState();
    };
  }, [config]);

  return (
    <EuiTabbedContent
      tabs={euiTabs}
      selectedTab={euiTabs.find(tab => tab.id === selectedTabId)}
      onTabClick={tab => {
        setSelectedTabId(tab.id);
        syncingStateFunc.setCurrentTab(tab.id);
      }}
    />
  );
}
