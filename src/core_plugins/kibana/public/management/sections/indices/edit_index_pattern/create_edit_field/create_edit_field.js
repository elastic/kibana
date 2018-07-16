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

import { IndexPatternsFieldProvider } from 'ui/index_patterns/_field';
import { RegistryFieldFormatEditorsProvider } from 'ui/registry/field_format_editors';
import { KbnUrlProvider } from 'ui/url';
import uiRoutes from 'ui/routes';
import { toastNotifications } from 'ui/notify';
import template from './create_edit_field.html';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { FieldEditor } from 'ui/field_editor';

const REACT_FIELD_EDITOR_ID = 'reactFieldEditor';
const renderFieldEditor = ($scope, indexPattern, field, {
  Field,
  getConfig,
  $http,
  fieldFormatEditors,
  redirectAway,
}) => {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_FIELD_EDITOR_ID);
    if (!node) {
      return;
    }

    render(
      <FieldEditor
        indexPattern={indexPattern}
        field={field}
        helpers={{
          Field,
          getConfig,
          $http,
          fieldFormatEditors,
          redirectAway,
        }}
      />,
      node,
    );
  });
};

const destroyFieldEditor = () => {
  const node = document.getElementById(REACT_FIELD_EDITOR_ID);
  node && unmountComponentAtNode(node);
};

uiRoutes
  .when('/management/kibana/indices/:indexPatternId/field/:fieldName*', { mode: 'edit' })
  .when('/management/kibana/indices/:indexPatternId/create-field/', { mode: 'create' })
  .defaults(/management\/kibana\/indices\/[^\/]+\/(field|create-field)(\/|$)/, {
    template,
    mapBreadcrumbs($route, breadcrumbs) {
      const { indexPattern } = $route.current.locals;
      return breadcrumbs.map(crumb => {
        if (crumb.id !== indexPattern.id) {
          return crumb;
        }

        return {
          ...crumb,
          display: indexPattern.title
        };
      });
    },
    resolve: {
      indexPattern: function ($route, redirectWhenMissing, indexPatterns) {
        return indexPatterns.get($route.current.params.indexPatternId)
          .catch(redirectWhenMissing('/management/kibana/indices'));
      }
    },
    controllerAs: 'fieldSettings',
    controller: function FieldEditorPageController($scope, $route, $timeout, $http, Private, docTitle, config) {
      const Field = Private(IndexPatternsFieldProvider);
      const getConfig = (...args) => config.get(...args);
      const fieldFormatEditors = Private(RegistryFieldFormatEditorsProvider);
      const kbnUrl = Private(KbnUrlProvider);

      this.mode = $route.current.mode;
      this.indexPattern = $route.current.locals.indexPattern;


      if (this.mode === 'edit') {
        const fieldName = $route.current.params.fieldName;
        this.field = this.indexPattern.fields.byName[fieldName];

        if (!this.field) {
          toastNotifications.add(`'${this.indexPattern.title}' index pattern doesn't have a scripted field called '${fieldName}'`);

          kbnUrl.redirectToRoute(this.indexPattern, 'edit');
          return;
        }

      }
      else if (this.mode === 'create') {
        this.field = new Field(this.indexPattern, {
          scripted: true,
          type: 'number'
        });
      }
      else {
        throw new Error('unknown fieldSettings mode ' + this.mode);
      }

      docTitle.change([this.field.name || 'New Scripted Field', this.indexPattern.title]);

      renderFieldEditor($scope, this.indexPattern, this.field, {
        Field,
        getConfig,
        $http,
        fieldFormatEditors,
        redirectAway: () => {
          $timeout(() => {
            kbnUrl.changeToRoute(this.indexPattern, this.field.scripted ? 'scriptedFields' : 'indexedFields');
          });
        }
      });

      $scope.$on('$destroy', () => {
        destroyFieldEditor();
      });
    }
  });
