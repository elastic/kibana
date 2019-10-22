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

import _ from 'lodash';
import './create_edit_field';
import { docTitle } from 'ui/doc_title';
import { KbnUrlProvider } from 'ui/url';
import { IndicesEditSectionsProvider } from './edit_sections';
import { fatalError, toastNotifications } from 'ui/notify';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './edit_index_pattern.html';
import { fieldWildcardMatcher } from 'ui/field_wildcard';
import { IndexPatternListFactory } from 'ui/management/index_pattern_list';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { EuiSpacer } from '@elastic/eui';
import { IndexHeader, Badges, GuideText, Alerts, Tabs } from './components';

import { getEditBreadcrumbs } from '../breadcrumbs';

const REACT_EDIT_INDEX_REACT_COMPONENT = 'editIndexReactComponent';

function updateReactComponent($scope, config) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_EDIT_INDEX_REACT_COMPONENT);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <IndexHeader
          defaultIndex={$scope.indexPattern.id === config.get('defaultIndex')}
          indexPatternTitle={$scope.indexPattern.title}
          setDefault={$scope.setDefaultPattern}
          refreshFields={$scope.refreshFields}
          removePattern={$scope.removePattern}
        />
        <EuiSpacer size="s" />

        {$scope.indexPattern.timeFieldName || ($scope.indexPattern.tags && $scope.indexPattern.tags.length) ? (
          <Badges indexPattern={$scope.indexPattern} />
        ) : null}
        <EuiSpacer size="m" />

        <GuideText indexPattern={$scope.indexPattern} />
        <EuiSpacer size="m" />

        {$scope.conflictFields.length > 0 ? <Alerts conflictFields={$scope.conflictFields} /> : null}

        <Tabs $scope={$scope} />
      </I18nContext>,
      node
    );
  });
}

function destoryReactComponent() {
  const node = document.getElementById(REACT_EDIT_INDEX_REACT_COMPONENT);
  node && unmountComponentAtNode(node);
}

uiRoutes
  .when('/management/kibana/index_patterns/:indexPatternId', {
    template,
    k7Breadcrumbs: getEditBreadcrumbs,
    resolve: {
      indexPattern: function ($route, Promise, redirectWhenMissing, indexPatterns) {
        return Promise.resolve(indexPatterns.get($route.current.params.indexPatternId))
          .catch(redirectWhenMissing('/management/kibana/index_patterns'));
      }
    },
  });

uiModules.get('apps/management')
  .controller('managementIndexPatternsEdit', function (
    $scope, $location, $route, Promise, config, indexPatterns, Private, AppState, confirmModal) {
    const $state = $scope.state = new AppState();
    const indexPatternListProvider = Private(IndexPatternListFactory)();

    $scope.fieldWildcardMatcher = (...args) => fieldWildcardMatcher(...args, config.get('metaFields'));
    $scope.editSectionsProvider = Private(IndicesEditSectionsProvider);
    $scope.kbnUrl = Private(KbnUrlProvider);
    $scope.indexPattern = $route.current.locals.indexPattern;
    $scope.indexPatternListProvider = indexPatternListProvider;
    $scope.indexPattern.tags = indexPatternListProvider.getIndexPatternTags(
      $scope.indexPattern,
      $scope.indexPattern.id === config.get('defaultIndex')
    );
    config.bindToScope($scope, 'defaultIndex');
    $scope.getFieldInfo = indexPatternListProvider.getFieldInfo;
    docTitle.change($scope.indexPattern.title);

    const otherPatterns = _.filter($route.current.locals.indexPatterns, pattern => {
      return pattern.id !== $scope.indexPattern.id;
    });

    $scope.$watch('indexPattern.fields', function () {
      $scope.editSections = $scope.editSectionsProvider($scope.indexPattern, $scope.fieldFilter, indexPatternListProvider);
      $scope.refreshFilters();
      $scope.fields = $scope.indexPattern.getNonScriptedFields();
    });

    $scope.refreshFilters = function () {
      const indexedFieldTypes = [];
      const scriptedFieldLanguages = [];
      $scope.indexPattern.fields.forEach(field => {
        if (field.scripted) {
          scriptedFieldLanguages.push(field.lang);
        } else {
          indexedFieldTypes.push(field.type);
        }
      });

      $scope.indexedFieldTypes = _.unique(indexedFieldTypes);
      $scope.scriptedFieldLanguages = _.unique(scriptedFieldLanguages);
    };

    $scope.changeFilter = function (filter, val) {
      $scope[filter] = val || ''; // null causes filter to check for null explicitly
    };

    $scope.changeTab = function (index) {
      $state.tab = index;
      $state.save();
    };

    $scope.$watch('state.tab', function (tab) {
      if (!tab) $scope.changeTab($scope.editSections[0].index);
    });

    $scope.$watchCollection('indexPattern.fields', function () {
      $scope.conflictFields = $scope.indexPattern.fields
        .filter(field => field.type === 'conflict');
    });

    $scope.refreshFields = function () {
      const confirmMessage = i18n.translate('kbn.management.editIndexPattern.refreshLabel', {
        defaultMessage: 'This action resets the popularity counter of each field.'
      });
      const confirmModalOptions = {
        confirmButtonText: i18n.translate('kbn.management.editIndexPattern.refreshButton', { defaultMessage: 'Refresh' }),
        onConfirm: async () => {
          await $scope.indexPattern.init(true);
          $scope.fields = $scope.indexPattern.getNonScriptedFields();
        },
        title: i18n.translate('kbn.management.editIndexPattern.refreshHeader', { defaultMessage: 'Refresh field list?' })
      };
      confirmModal(
        confirmMessage,
        confirmModalOptions
      );
    };

    $scope.removePattern = function () {
      function doRemove() {
        if ($scope.indexPattern.id === config.get('defaultIndex')) {
          config.remove('defaultIndex');

          if (otherPatterns.length) {
            config.set('defaultIndex', otherPatterns[0].id);
          }
        }

        Promise.resolve($scope.indexPattern.destroy())
          .then(function () {
            $location.url('/management/kibana/index_patterns');
          })
          .catch(fatalError);
      }

      const confirmModalOptions = {
        confirmButtonText: i18n.translate('kbn.management.editIndexPattern.deleteButton', { defaultMessage: 'Delete' }),
        onConfirm: doRemove,
        title: i18n.translate('kbn.management.editIndexPattern.deleteHeader', { defaultMessage: 'Delete index pattern?' })
      };
      confirmModal('', confirmModalOptions);
    };

    $scope.setDefaultPattern = function () {
      config.set('defaultIndex', $scope.indexPattern.id);
    };

    $scope.setIndexPatternsTimeField = function (field) {
      if (field.type !== 'date') {
        const errorMessage = i18n.translate('kbn.management.editIndexPattern.notDateErrorMessage', {
          defaultMessage: 'That field is a {fieldType} not a date.', values: { fieldType: field.type }
        });
        toastNotifications.addDanger(errorMessage);
        return;
      }
      $scope.indexPattern.timeFieldName = field.name;
      return $scope.indexPattern.save();
    };

    $scope.$watch('defaultIndex', () => {
      updateReactComponent($scope, config);
    });

    $scope.$watch('fieldFilter', () => {
      $scope.editSections = $scope.editSectionsProvider($scope.indexPattern, $scope.fieldFilter, indexPatternListProvider);
      if ($scope.fieldFilter === undefined) {
        return;
      }

      updateReactComponent($scope, config);
    });

    $scope.$watch('indexedFieldTypeFilter', () => {
      if ($scope.indexedFieldTypeFilter !== undefined && $state.tab === 'indexedFields') {
        updateReactComponent($scope, config);
      }
    });

    $scope.$watch('scriptedFieldLanguageFilter', () => {
      if ($scope.scriptedFieldLanguageFilter !== undefined && $state.tab === 'scriptedFields') {
        updateReactComponent($scope, config);
      }
    });

    $scope.$on('$destroy', () => {
      destoryReactComponent();
    });

    updateReactComponent($scope, config);
  });
