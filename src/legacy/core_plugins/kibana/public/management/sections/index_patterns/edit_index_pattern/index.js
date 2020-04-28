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
import { HashRouter } from 'react-router-dom';
import { render, unmountComponentAtNode } from 'react-dom';
import { RegistryFieldFormatEditorsProvider } from 'ui/registry/field_format_editors';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import template from './edit_index_pattern.html';
import createEditFieldtemplate from './create_edit_field.html';
import {
  getEditBreadcrumbs,
  getEditFieldBreadcrumbs,
  getCreateFieldBreadcrumbs,
} from '../breadcrumbs';
import { EditIndexPattern } from './edit_index_pattern';
import { CreateEditField } from './create_edit_field';

const REACT_EDIT_INDEX_PATTERN_DOM_ELEMENT_ID = 'reactEditIndexPattern';

function destroyEditIndexPattern() {
  const node = document.getElementById(REACT_EDIT_INDEX_PATTERN_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

function renderEditIndexPattern($scope, config, $route) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_EDIT_INDEX_PATTERN_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <HashRouter>
        <I18nContext>
          <EditIndexPattern
            indexPattern={$route.current.locals.indexPattern}
            indexPatterns={$route.current.locals.indexPatterns}
            config={config}
            services={{
              notifications: npStart.core.notifications,
              docTitle: npStart.core.chrome.docTitle,
              overlays: npStart.core.overlays,
              indexPatternManagement: npStart.plugins.indexPatternManagement,
            }}
          />
        </I18nContext>
      </HashRouter>,
      node
    );
  });
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
  .controller('managementIndexPatternsEdit', function($scope, $route, config) {
    $scope.$on('$destroy', () => {
      destroyEditIndexPattern();
    });

    renderEditIndexPattern($scope, config, $route);
  });

// routes for create edit field. Will be removed after migartion all component to react.
const REACT_FIELD_EDITOR_ID = 'reactFieldEditor';
const renderCreateEditField = ($scope, $route, getConfig, fieldFormatEditors) => {
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
              getHttpStart: () => npStart.core.http,
              notifications: npStart.core.notifications,
              docTitle: npStart.core.chrome.docTitle,
              docLinksScriptedFields: npStart.core.docLinks.links.scriptedFields,
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
    controller: function FieldEditorPageController($scope, $route, Private, config) {
      const getConfig = (...args) => config.get(...args);
      const fieldFormatEditors = Private(RegistryFieldFormatEditorsProvider);

      renderCreateEditField($scope, $route, getConfig, fieldFormatEditors);

      $scope.$on('$destroy', () => {
        destroyCreateEditField();
      });
    },
  });
