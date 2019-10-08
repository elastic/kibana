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

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiTabbedContent, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SearchField } from './search_field';
// @ts-ignore
import { IndexedFieldsTable } from '../indexed_fields_table';
// @ts-ignore
import { ScriptedFieldsTable } from '../scripted_fields_table';
// @ts-ignore
import { SourceFiltersTable } from '../source_filters_table';

interface Props {
  $scope: any;
}

export const Tabs = ({ $scope }: Props) => {
  const tabs = tabContents.map(tab => {
    const section = $scope.editSections.find((s: any) => s.index === tab.index);
    return {
      id: tab.index,
      name: `${section.title} (${
        section.count !== section.totalCount
          ? `${section.count} / ${section.totalCount}`
          : `${section.count}`
      })`,
      content: tab.content($scope),
      'data-test-subj': `tab-${tab.index}`,
    };
  });

  const currentTabIndex = tabContents.findIndex(t => t.index === $scope.state.tab);
  const currentTab = currentTabIndex !== -1 ? tabs[currentTabIndex] : tabs[0];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={currentTab}
      onTabClick={tab => {
        $scope.changeTab(tab.id);
      }}
    />
  );
};

const tabContents = [
  {
    index: 'indexedFields',
    content: ($scope: any) => (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <SearchField $scope={$scope} />
          </EuiFlexItem>
          {$scope.indexedFieldTypes.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={[
                  {
                    value: '',
                    text: i18n.translate(
                      'kbn.management.editIndexPattern.fields.allTypesDropDown',
                      {
                        defaultMessage: 'All field types',
                      }
                    ),
                  },
                ].concat($scope.indexedFieldTypes.map((t: any) => ({ value: t, text: t })))}
                value={$scope.indexedFieldTypeFilter}
                onChange={event => {
                  $scope.indexedFieldTypeFilter = event.target.value;
                  $scope.$apply();
                }}
                data-test-subj="indexedFieldTypeFilterDropdown"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <IndexedFieldsTable
          fields={$scope.fields}
          indexPattern={$scope.indexPattern}
          fieldFilter={$scope.fieldFilter}
          fieldWildcardMatcher={$scope.fieldWildcardMatcher}
          indexedFieldTypeFilter={$scope.indexedFieldTypeFilter}
          helpers={{
            redirectToRoute: (obj: any, route: any) => {
              const url = $scope.kbnUrl.getRouteUrl(obj, route);
              $scope.kbnUrl.change(url);
              $scope.$apply();
            },
            getFieldInfo: $scope.getFieldInfo,
          }}
        />
      </>
    ),
  },
  {
    index: 'scriptedFields',
    content: ($scope: any) => (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <SearchField $scope={$scope} />
          </EuiFlexItem>
          {$scope.scriptedFieldLanguages.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={[
                  {
                    value: '',
                    text: i18n.translate(
                      'kbn.management.editIndexPattern.fields.allLangsDropDown',
                      {
                        defaultMessage: 'All languages',
                      }
                    ),
                  },
                ].concat($scope.scriptedFieldLanguages.map((t: any) => ({ value: t, text: t })))}
                value={$scope.scriptedFieldLanguageFilter}
                onChange={event => {
                  $scope.scriptedFieldLanguageFilter = event.target.value;
                  $scope.$apply();
                }}
                data-test-subj="scriptedFieldLanguageFilterDropdown"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <ScriptedFieldsTable
          indexPattern={$scope.indexPattern}
          fieldFilter={$scope.fieldFilter}
          scriptedFieldLanguageFilter={$scope.scriptedFieldLanguageFilter}
          helpers={{
            redirectToRoute: (obj: any, route: any) => {
              const url = $scope.kbnUrl.getRouteUrl(obj, route);
              $scope.kbnUrl.change(url);
              $scope.$apply();
            },
            getRouteHref: (obj: any, route: any) => $scope.kbnUrl.getRouteHref(obj, route),
          }}
          onRemoveField={() => {
            $scope.editSections = $scope.editSectionsProvider(
              $scope.indexPattern,
              $scope.fieldFilter,
              $scope.indexPatternListProvider
            );
            $scope.refreshFilters();
            $scope.$apply();
          }}
        />
      </>
    ),
  },
  {
    index: 'sourceFilters',
    content: ($scope: any) => (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <SearchField $scope={$scope} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <SourceFiltersTable
          indexPattern={$scope.indexPattern}
          filterFilter={$scope.fieldFilter}
          fieldWildcardMatcher={$scope.fieldWildcardMatcher}
          onAddOrRemoveFilter={() => {
            $scope.editSections = $scope.editSectionsProvider(
              $scope.indexPattern,
              $scope.fieldFilter,
              $scope.indexPatternListProvider
            );
            $scope.refreshFilters();
            $scope.$apply();
          }}
        />
      </>
    ),
  },
];
