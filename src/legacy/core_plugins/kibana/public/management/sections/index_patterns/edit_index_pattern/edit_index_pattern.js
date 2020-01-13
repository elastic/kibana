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
import './index_header';
import './create_edit_field';
import { docTitle } from 'ui/doc_title';
import { KbnUrlProvider } from 'ui/url';
import { IndicesEditSectionsProvider } from './edit_sections';
import { fatalError, toastNotifications } from 'ui/notify';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './edit_index_pattern.html';
import {
  fieldWildcardMatcher,
  createStateContainer,
  syncState,
  createKbnUrlStateStorage,
} from '../../../../../../../../plugins/kibana_utils/public';
import { setup as managementSetup } from '../../../../../../management/public/legacy';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SourceFiltersTable } from './source_filters_table';
import { IndexedFieldsTable } from './indexed_fields_table';
import { ScriptedFieldsTable } from './scripted_fields_table';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';

import { getEditBreadcrumbs } from '../breadcrumbs';
import { createHashHistory } from 'history';

const REACT_SOURCE_FILTERS_DOM_ELEMENT_ID = 'reactSourceFiltersTable';
const REACT_INDEXED_FIELDS_DOM_ELEMENT_ID = 'reactIndexedFieldsTable';
const REACT_SCRIPTED_FIELDS_DOM_ELEMENT_ID = 'reactScriptedFieldsTable';

const TAB_INDEXED_FIELDS = 'indexedFields';
const TAB_SCRIPTED_FIELDS = 'scriptedFields';
const TAB_SOURCE_FILTERS = 'sourceFilters';

function updateSourceFiltersTable($scope) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_SOURCE_FILTERS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
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
      </I18nContext>,
      node
    );
  });
}

function destroySourceFiltersTable() {
  const node = document.getElementById(REACT_SOURCE_FILTERS_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

function updateScriptedFieldsTable($scope) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_SCRIPTED_FIELDS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <ScriptedFieldsTable
          indexPattern={$scope.indexPattern}
          fieldFilter={$scope.fieldFilter}
          scriptedFieldLanguageFilter={$scope.scriptedFieldLanguageFilter}
          helpers={{
            redirectToRoute: (obj, route) => {
              $scope.kbnUrl.changeToRoute(obj, route);
              $scope.$apply();
            },
            getRouteHref: (obj, route) => $scope.kbnUrl.getRouteHref(obj, route),
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
      </I18nContext>,
      node
    );
  });
}

function destroyScriptedFieldsTable() {
  const node = document.getElementById(REACT_SCRIPTED_FIELDS_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

function updateIndexedFieldsTable($scope) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_INDEXED_FIELDS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <IndexedFieldsTable
          fields={$scope.fields}
          indexPattern={$scope.indexPattern}
          fieldFilter={$scope.fieldFilter}
          fieldWildcardMatcher={$scope.fieldWildcardMatcher}
          indexedFieldTypeFilter={$scope.indexedFieldTypeFilter}
          helpers={{
            redirectToRoute: (obj, route) => {
              $scope.kbnUrl.changeToRoute(obj, route);
              $scope.$apply();
            },
            getFieldInfo: $scope.getFieldInfo,
          }}
        />
      </I18nContext>,
      node
    );
  });
}

function destroyIndexedFieldsTable() {
  const node = document.getElementById(REACT_INDEXED_FIELDS_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

function handleTabChange($scope, newTab) {
  switch (newTab) {
    case TAB_SCRIPTED_FIELDS:
      destroyIndexedFieldsTable();
      destroySourceFiltersTable();
      return updateScriptedFieldsTable($scope);
    case TAB_INDEXED_FIELDS:
      destroyScriptedFieldsTable();
      destroySourceFiltersTable();
      return updateIndexedFieldsTable($scope);
    case TAB_SOURCE_FILTERS:
      destroyIndexedFieldsTable();
      destroyScriptedFieldsTable();
      return updateSourceFiltersTable($scope);
  }
}

/**
 * Create state container with sync config for tab navigation specific for edit_index_patter page
 */
function createEditIndexPatternPageStateContainer({ useHashedUrl }) {
  // until angular is used as shell - use hash history
  const history = createHashHistory();
  // query param to store app state at
  const stateStorageKey = '_a';
  // default app state, when there is no initial state in the url
  const defaultState = {
    tab: TAB_INDEXED_FIELDS,
  };
  const kbnUrlStateStorage = createKbnUrlStateStorage({
    useHash: useHashedUrl,
    history,
  });
  // extract starting app state from URL and use it as starting app state in state container
  const initialStateFromUrl = kbnUrlStateStorage.get(stateStorageKey);
  const stateContainer = createStateContainer(
    {
      ...defaultState,
      ...initialStateFromUrl,
    },
    {
      setTab: state => tab => ({ ...state, tab }),
    },
    {
      tab: state => () => state.tab,
    }
  );

  const { start, stop } = syncState({
    storageKey: stateStorageKey,
    stateContainer: {
      ...stateContainer,
      // state syncing utility requires state containers to handle "null"
      set: state => state && stateContainer.set(state),
    },
    stateStorage: kbnUrlStateStorage,
  });

  // makes sure initial url is the same as initial state (this is not really required)
  kbnUrlStateStorage.set(stateStorageKey, stateContainer.getState(), { replace: true });

  // expose api needed for Controller
  return {
    startSyncingState: start,
    stopSyncingState: stop,
    setCurrentTab: newTab => stateContainer.transitions.setTab(newTab),
    getCurrentTab: () => stateContainer.selectors.tab(),
    state$: stateContainer.state$,
  };
}

uiRoutes.when('/management/kibana/index_patterns/:indexPatternId', {
  template,
  k7Breadcrumbs: getEditBreadcrumbs,
  resolve: {
    indexPattern: function($route, Promise, redirectWhenMissing) {
      const { indexPatterns } = npStart.plugins.data;
      return Promise.resolve(indexPatterns.get($route.current.params.indexPatternId)).catch(
        redirectWhenMissing('/management/kibana/index_patterns')
      );
    },
  },
});

uiModules
  .get('apps/management')
  .controller('managementIndexPatternsEdit', function(
    $scope,
    $location,
    $route,
    Promise,
    config,
    Private,
    confirmModal
  ) {
    const {
      startSyncingState,
      stopSyncingState,
      setCurrentTab,
      getCurrentTab,
      state$,
    } = createEditIndexPatternPageStateContainer({
      useHashedUrl: config.get('state:storeInSessionStorage'),
    });

    $scope.getCurrentTab = getCurrentTab;
    $scope.setCurrentTab = setCurrentTab;

    const stateChangedSub = state$.subscribe(({ tab }) => {
      handleTabChange($scope, tab);
      $scope.$applyAsync();
    });
    handleTabChange($scope, getCurrentTab()); // setup initial tab depending on initial tab state

    startSyncingState(); // starts syncing state between state container and url

    const destroyState = () => {
      stateChangedSub.unsubscribe();
      stopSyncingState();
    };

    $scope.fieldWildcardMatcher = (...args) =>
      fieldWildcardMatcher(...args, config.get('metaFields'));
    $scope.editSectionsProvider = Private(IndicesEditSectionsProvider);
    $scope.kbnUrl = Private(KbnUrlProvider);
    $scope.indexPattern = $route.current.locals.indexPattern;
    $scope.indexPatternListProvider = managementSetup.indexPattern.list;
    $scope.indexPattern.tags = managementSetup.indexPattern.list.getIndexPatternTags(
      $scope.indexPattern,
      $scope.indexPattern.id === config.get('defaultIndex')
    );
    $scope.getFieldInfo = managementSetup.indexPattern.list.getFieldInfo.bind(
      managementSetup.indexPattern.list
    );
    docTitle.change($scope.indexPattern.title);

    const otherPatterns = _.filter($route.current.locals.indexPatterns, pattern => {
      return pattern.id !== $scope.indexPattern.id;
    });

    $scope.$watch('indexPattern.fields', function() {
      $scope.editSections = $scope.editSectionsProvider(
        $scope.indexPattern,
        $scope.fieldFilter,
        managementSetup.indexPattern.list
      );
      $scope.refreshFilters();
      $scope.fields = $scope.indexPattern.getNonScriptedFields();
    });

    $scope.refreshFilters = function() {
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

    $scope.changeFilter = function(filter, val) {
      $scope[filter] = val || ''; // null causes filter to check for null explicitly
    };

    $scope.$watchCollection('indexPattern.fields', function() {
      $scope.conflictFields = $scope.indexPattern.fields.filter(field => field.type === 'conflict');
    });

    $scope.refreshFields = function() {
      const confirmMessage = i18n.translate('kbn.management.editIndexPattern.refreshLabel', {
        defaultMessage: 'This action resets the popularity counter of each field.',
      });
      const confirmModalOptions = {
        confirmButtonText: i18n.translate('kbn.management.editIndexPattern.refreshButton', {
          defaultMessage: 'Refresh',
        }),
        onConfirm: async () => {
          await $scope.indexPattern.init(true);
          $scope.fields = $scope.indexPattern.getNonScriptedFields();
        },
        title: i18n.translate('kbn.management.editIndexPattern.refreshHeader', {
          defaultMessage: 'Refresh field list?',
        }),
      };
      confirmModal(confirmMessage, confirmModalOptions);
    };

    $scope.removePattern = function() {
      function doRemove() {
        if ($scope.indexPattern.id === config.get('defaultIndex')) {
          config.remove('defaultIndex');

          if (otherPatterns.length) {
            config.set('defaultIndex', otherPatterns[0].id);
          }
        }

        Promise.resolve($scope.indexPattern.destroy())
          .then(function() {
            $location.url('/management/kibana/index_patterns');
          })
          .catch(fatalError);
      }

      const confirmModalOptions = {
        confirmButtonText: i18n.translate('kbn.management.editIndexPattern.deleteButton', {
          defaultMessage: 'Delete',
        }),
        onConfirm: doRemove,
        title: i18n.translate('kbn.management.editIndexPattern.deleteHeader', {
          defaultMessage: 'Delete index pattern?',
        }),
      };
      confirmModal('', confirmModalOptions);
    };

    $scope.setDefaultPattern = function() {
      config.set('defaultIndex', $scope.indexPattern.id);
    };

    $scope.setIndexPatternsTimeField = function(field) {
      if (field.type !== 'date') {
        const errorMessage = i18n.translate('kbn.management.editIndexPattern.notDateErrorMessage', {
          defaultMessage: 'That field is a {fieldType} not a date.',
          values: { fieldType: field.type },
        });
        toastNotifications.addDanger(errorMessage);
        return;
      }
      $scope.indexPattern.timeFieldName = field.name;
      return $scope.indexPattern.save();
    };

    $scope.$watch('fieldFilter', () => {
      $scope.editSections = $scope.editSectionsProvider(
        $scope.indexPattern,
        $scope.fieldFilter,
        managementSetup.indexPattern.list
      );

      if ($scope.fieldFilter === undefined) {
        return;
      }

      switch (getCurrentTab()) {
        case TAB_INDEXED_FIELDS:
          updateIndexedFieldsTable($scope);
          break;
        case TAB_SCRIPTED_FIELDS:
          updateScriptedFieldsTable($scope);
          break;
        case TAB_SOURCE_FILTERS:
          updateSourceFiltersTable($scope);
          break;
      }
    });

    $scope.$watch('indexedFieldTypeFilter', () => {
      if ($scope.indexedFieldTypeFilter !== undefined && getCurrentTab() === TAB_INDEXED_FIELDS) {
        updateIndexedFieldsTable($scope);
      }
    });

    $scope.$watch('scriptedFieldLanguageFilter', () => {
      if (
        $scope.scriptedFieldLanguageFilter !== undefined &&
        getCurrentTab() === TAB_SCRIPTED_FIELDS
      ) {
        updateScriptedFieldsTable($scope);
      }
    });

    $scope.$on('$destroy', () => {
      destroyIndexedFieldsTable();
      destroyScriptedFieldsTable();
      destroySourceFiltersTable();
      destroyState();
    });
  });
