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
import { HashRouter } from 'react-router-dom';
import { IndexHeader } from './index_header';
import { CreateEditField } from './create_edit_field';
import { docTitle } from 'ui/doc_title';
import { KbnUrlProvider } from 'ui/url';
import { IndicesEditSectionsProvider } from './edit_sections';
import { fatalError, toastNotifications } from 'ui/notify';
import { RegistryFieldFormatEditorsProvider } from 'ui/registry/field_format_editors';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './edit_index_pattern.html';
import createEditFieldtemplate from './create_edit_field.html';
import { fieldWildcardMatcher } from '../../../../../../../../plugins/kibana_utils/public';
import { subscribeWithScope } from '../../../../../../../../plugins/kibana_legacy/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SourceFiltersTable } from './source_filters_table';
import { IndexedFieldsTable } from './indexed_fields_table';
import { ScriptedFieldsTable } from './scripted_fields_table';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import {
  getEditBreadcrumbs,
  getEditFieldBreadcrumbs,
  getCreateFieldBreadcrumbs,
} from '../breadcrumbs';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from './constants';
import { createEditIndexPatternPageStateContainer } from './edit_index_pattern_state_container';

const REACT_SOURCE_FILTERS_DOM_ELEMENT_ID = 'reactSourceFiltersTable';
const REACT_INDEXED_FIELDS_DOM_ELEMENT_ID = 'reactIndexedFieldsTable';
const REACT_SCRIPTED_FIELDS_DOM_ELEMENT_ID = 'reactScriptedFieldsTable';
const REACT_INDEX_HEADER_DOM_ELEMENT_ID = 'reactIndexHeader';

const EDIT_FIELD_PATH = '/management/kibana/index_patterns/{{indexPattern.id}}/field/{{name}}';

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
            redirectToRoute: field => {
              $scope.kbnUrl.changePath(EDIT_FIELD_PATH, field);
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
            redirectToRoute: field => {
              $scope.kbnUrl.changePath(EDIT_FIELD_PATH, field);
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

function destroyIndexHeader() {
  const node = document.getElementById(REACT_INDEX_HEADER_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

function renderIndexHeader($scope, config) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_INDEX_HEADER_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <IndexHeader
          indexPattern={$scope.indexPattern}
          setDefault={$scope.setDefaultPattern}
          refreshFields={$scope.refreshFields}
          deleteIndexPattern={$scope.removePattern}
          defaultIndex={config.get('defaultIndex')}
        />
      </I18nContext>,
      node
    );
  });
}

function handleTabChange($scope, newTab) {
  destroyIndexedFieldsTable();
  destroySourceFiltersTable();
  destroyScriptedFieldsTable();
  updateTables($scope, newTab);
}

function updateTables($scope, currentTab) {
  switch (currentTab) {
    case TAB_SCRIPTED_FIELDS:
      return updateScriptedFieldsTable($scope);
    case TAB_INDEXED_FIELDS:
      return updateIndexedFieldsTable($scope);
    case TAB_SOURCE_FILTERS:
      return updateSourceFiltersTable($scope);
  }
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
    Private
  ) {
    const {
      startSyncingState,
      stopSyncingState,
      setCurrentTab,
      getCurrentTab,
      state$,
    } = createEditIndexPatternPageStateContainer({
      useHashedUrl: config.get('state:storeInSessionStorage'),
      defaultTab: TAB_INDEXED_FIELDS,
    });

    $scope.getCurrentTab = getCurrentTab;
    $scope.setCurrentTab = setCurrentTab;

    const stateChangedSub = subscribeWithScope(
      $scope,
      state$,
      {
        next: ({ tab }) => {
          handleTabChange($scope, tab);
        },
      },
      fatalError
    );

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
    $scope.indexPatternListProvider = npStart.plugins.indexPatternManagement.list;
    $scope.indexPattern.tags = npStart.plugins.indexPatternManagement.list.getIndexPatternTags(
      $scope.indexPattern,
      $scope.indexPattern.id === config.get('defaultIndex')
    );
    $scope.getFieldInfo = npStart.plugins.indexPatternManagement.list.getFieldInfo;
    docTitle.change($scope.indexPattern.title);

    const otherPatterns = _.filter($route.current.locals.indexPatterns, pattern => {
      return pattern.id !== $scope.indexPattern.id;
    });

    $scope.$watch('indexPattern.fields', function() {
      $scope.editSections = $scope.editSectionsProvider(
        $scope.indexPattern,
        $scope.fieldFilter,
        npStart.plugins.indexPatternManagement.list
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
        title: i18n.translate('kbn.management.editIndexPattern.refreshHeader', {
          defaultMessage: 'Refresh field list?',
        }),
      };

      npStart.core.overlays
        .openConfirm(confirmMessage, confirmModalOptions)
        .then(async isConfirmed => {
          if (isConfirmed) {
            await $scope.indexPattern.init(true);
            $scope.fields = $scope.indexPattern.getNonScriptedFields();
          }
        });
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
        title: i18n.translate('kbn.management.editIndexPattern.deleteHeader', {
          defaultMessage: 'Delete index pattern?',
        }),
      };

      npStart.core.overlays.openConfirm('', confirmModalOptions).then(isConfirmed => {
        if (isConfirmed) {
          doRemove();
        }
      });
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
        npStart.plugins.indexPatternManagement.list
      );

      if ($scope.fieldFilter === undefined) {
        return;
      }

      updateTables($scope, getCurrentTab());
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
      destroyIndexHeader();
      destroyState();
    });

    renderIndexHeader($scope, config);
  });

// routes for create edit field. Will be removed after migartion all component to react.
const REACT_FIELD_EDITOR_ID = 'reactFieldEditor';
const renderCreateEditField = ($scope, $route, getConfig, $http, fieldFormatEditors) => {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_FIELD_EDITOR_ID);
    if (!node) {
      return;
    }

    render(
      <HashRouter>
        <I18nContext>
          <CreateEditField
            indexPattern={$route.current.locals.indexPattern}
            mode={$route.current.mode}
            fieldName={$route.current.params.fieldName}
            fieldFormatEditors={fieldFormatEditors}
            getConfig={getConfig}
            services={{
              http: $http,
              notifications: npStart.core.notifications,
              docTitle: npStart.core.chrome.docTitle,
            }}
          />
        </I18nContext>
      </HashRouter>,
      node
    );
  });
};

const destroyCreateEditField = () => {
  const node = document.getElementById(REACT_FIELD_EDITOR_ID);
  node && unmountComponentAtNode(node);
};

uiRoutes
  .when('/management/kibana/index_patterns/:indexPatternId/field/:fieldName*', {
    mode: 'edit',
    k7Breadcrumbs: getEditFieldBreadcrumbs,
  })
  .when('/management/kibana/index_patterns/:indexPatternId/create-field/', {
    mode: 'create',
    k7Breadcrumbs: getCreateFieldBreadcrumbs,
  })
  .defaults(/management\/kibana\/index_patterns\/[^\/]+\/(field|create-field)(\/|$)/, {
    template: createEditFieldtemplate,
    mapBreadcrumbs($route, breadcrumbs) {
      const { indexPattern } = $route.current.locals;
      return breadcrumbs.map(crumb => {
        if (crumb.id !== indexPattern.id) {
          return crumb;
        }

        return {
          ...crumb,
          display: indexPattern.title,
        };
      });
    },
    resolve: {
      indexPattern: function($route, Promise, redirectWhenMissing) {
        const { indexPatterns } = npStart.plugins.data;
        return Promise.resolve(indexPatterns.get($route.current.params.indexPatternId)).catch(
          redirectWhenMissing('/management/kibana/index_patterns')
        );
      },
    },
    controllerAs: 'fieldSettings',
    controller: function FieldEditorPageController($scope, $route, $http, Private, config) {
      const getConfig = (...args) => config.get(...args);
      const fieldFormatEditors = Private(RegistryFieldFormatEditorsProvider);

      renderCreateEditField($scope, $route, getConfig, $http, fieldFormatEditors);

      $scope.$on('$destroy', () => {
        destroyCreateEditField();
      });
    },
  });
