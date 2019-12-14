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

import { setup as data } from '../../../../../../../data/public/legacy';
const { FieldImpl: Field } = data.indexPatterns.__LEGACY;

import { RegistryFieldFormatEditorsProvider } from 'ui/registry/field_format_editors';
import { docTitle } from 'ui/doc_title';
import { KbnUrlProvider } from 'ui/url';
import uiRoutes from 'ui/routes';
import { toastNotifications } from 'ui/notify';

import template from './create_edit_field.html';
import { getEditFieldBreadcrumbs, getCreateFieldBreadcrumbs } from '../../breadcrumbs';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { FieldEditor } from 'ui/field_editor';
import { I18nContext } from 'ui/i18n';
import { i18n } from '@kbn/i18n';

const REACT_FIELD_EDITOR_ID = 'reactFieldEditor';
const renderFieldEditor = (
  $scope,
  indexPattern,
  field,
  { Field, getConfig, $http, fieldFormatEditors, redirectAway }
) => {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_FIELD_EDITOR_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
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
        />
      </I18nContext>,
      node
    );
  });
};

const destroyFieldEditor = () => {
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
    template,
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
      indexPattern: function($route, Promise, redirectWhenMissing, indexPatterns) {
        return Promise.resolve(indexPatterns.get($route.current.params.indexPatternId)).catch(
          redirectWhenMissing('/management/kibana/index_patterns')
        );
      },
    },
    controllerAs: 'fieldSettings',
    controller: function FieldEditorPageController(
      $scope,
      $route,
      $timeout,
      $http,
      Private,
      config
    ) {
      const getConfig = (...args) => config.get(...args);
      const fieldFormatEditors = Private(RegistryFieldFormatEditorsProvider);
      const kbnUrl = Private(KbnUrlProvider);

      this.mode = $route.current.mode;
      this.indexPattern = $route.current.locals.indexPattern;

      if (this.mode === 'edit') {
        const fieldName = $route.current.params.fieldName;
        this.field = this.indexPattern.fields.getByName(fieldName);

        if (!this.field) {
          const message = i18n.translate('kbn.management.editIndexPattern.scripted.noFieldLabel', {
            defaultMessage:
              "'{indexPatternTitle}' index pattern doesn't have a scripted field called '{fieldName}'",
            values: { indexPatternTitle: this.indexPattern.title, fieldName },
          });
          toastNotifications.add(message);

          kbnUrl.redirectToRoute(this.indexPattern, 'edit');
          return;
        }
      } else if (this.mode === 'create') {
        this.field = new Field(this.indexPattern, {
          scripted: true,
          type: 'number',
        });
      } else {
        const errorMessage = i18n.translate(
          'kbn.management.editIndexPattern.scripted.unknownModeErrorMessage',
          {
            defaultMessage: 'unknown fieldSettings mode {mode}',
            values: { mode: this.mode },
          }
        );
        throw new Error(errorMessage);
      }

      const fieldName =
        this.field.name ||
        i18n.translate('kbn.management.editIndexPattern.scripted.newFieldPlaceholder', {
          defaultMessage: 'New Scripted Field',
        });
      docTitle.change([fieldName, this.indexPattern.title]);

      renderFieldEditor($scope, this.indexPattern, this.field, {
        Field,
        getConfig,
        $http,
        fieldFormatEditors,
        redirectAway: () => {
          $timeout(() => {
            kbnUrl.changeToRoute(
              this.indexPattern,
              this.field.scripted ? 'scriptedFields' : 'indexedFields'
            );
          });
        },
      });

      $scope.$on('$destroy', () => {
        destroyFieldEditor();
      });
    },
  });
