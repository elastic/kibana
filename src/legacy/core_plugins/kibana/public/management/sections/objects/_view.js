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
import angular from 'angular';
import 'angular-elastic/elastic';
import rison from 'rison-node';
import { savedObjectManagementRegistry } from '../../saved_object_registry';
import objectViewHTML from './_view.html';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { fatalError, toastNotifications } from 'ui/notify';
import 'ui/accessibility/kbn_ui_ace_keyboard_mode';
import { castEsToKbnFieldTypeName } from '../../../../../../../legacy/utils';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { isNumeric } from 'ui/utils/numeric';
import { canViewInApp } from './lib/in_app_url';

import { getViewBreadcrumbs } from './breadcrumbs';

const location = 'SavedObject view';

uiRoutes
  .when('/management/kibana/objects/:service/:id', {
    template: objectViewHTML,
    k7Breadcrumbs: getViewBreadcrumbs,
    requireUICapability: 'management.kibana.objects',
  });

uiModules.get('apps/management', ['monospaced.elastic'])
  .directive('kbnManagementObjectsView', function (kbnIndex, confirmModal, i18n) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $routeParams, $location, $window, $rootScope, Private, uiCapabilities) {
        const serviceObj = savedObjectManagementRegistry.get($routeParams.service);
        const service = $injector.get(serviceObj.service);
        const savedObjectsClient = Private(SavedObjectsClientProvider);

        /**
       * Creates a field definition and pushes it to the memo stack. This function
       * is designed to be used in conjunction with _.reduce(). If the
       * values is plain object it will recurse through all the keys till it hits
       * a string, number or an array.
       *
       * @param {array} memo The stack of fields
       * @param {mixed} value The value of the field
       * @param {string} key The key of the field
       * @param {object} collection This is a reference the collection being reduced
       * @param {array} parents The parent keys to the field
       * @returns {array}
       */
        const createField = function (memo, val, key, collection, parents) {
          if (Array.isArray(parents)) {
            parents.push(key);
          } else {
            parents = [key];
          }

          const field = { type: 'text', name: parents.join('.'), value: val };

          if (_.isString(field.value)) {
            try {
              field.value = angular.toJson(JSON.parse(field.value), true);
              field.type = 'json';
            } catch (err) {
              field.value = field.value;
            }
          } else if (isNumeric(field.value)) {
            field.type = 'number';
          } else if (Array.isArray(field.value)) {
            field.type = 'array';
            field.value = angular.toJson(field.value, true);
          } else if (_.isBoolean(field.value)) {
            field.type = 'boolean';
            field.value = field.value;
          } else if (_.isPlainObject(field.value)) {
            // do something recursive
            return _.reduce(field.value, _.partialRight(createField, parents), memo);
          }

          memo.push(field);

          // once the field is added to the object you need to pop the parents
          // to remove it since we've hit the end of the branch.
          parents.pop();
          return memo;
        };

        const readObjectClass = function (fields, Class) {
          const fieldMap = _.indexBy(fields, 'name');

          _.forOwn(Class.mapping, function (esType, name) {
            if (fieldMap[name]) return;

            fields.push({
              name: name,
              type: (function () {
                switch (castEsToKbnFieldTypeName(esType)) {
                  case 'string': return 'text';
                  case 'number': return 'number';
                  case 'boolean': return 'boolean';
                  default: return 'json';
                }
              }())
            });
          });

          if (Class.searchSource && !fieldMap['kibanaSavedObjectMeta.searchSourceJSON']) {
            fields.push({
              name: 'kibanaSavedObjectMeta.searchSourceJSON',
              type: 'json',
              value: '{}'
            });
          }

          if (!fieldMap.references) {
            fields.push({
              name: 'references',
              type: 'array',
              value: '[]',
            });
          }
        };

        const { edit: canEdit, delete: canDelete } = uiCapabilities.savedObjectsManagement[service.type];
        $scope.canEdit = canEdit;
        $scope.canDelete = canDelete;
        $scope.canViewInApp = canViewInApp(uiCapabilities, service.type);

        $scope.notFound = $routeParams.notFound;

        $scope.title = service.type;

        savedObjectsClient.get(service.type, $routeParams.id)
          .then(function (obj) {
            $scope.obj = obj;
            $scope.link = service.urlFor(obj.id);

            const fields = _.reduce(obj.attributes, createField, []);
            // Special handling for references which isn't within "attributes"
            createField(fields, obj.references, 'references');

            if (service.Class) readObjectClass(fields, service.Class);

            // sorts twice since we want numerical sort to prioritize over name,
            // and sortBy will do string comparison if trying to match against strings
            const nameSortedFields = _.sortBy(fields, 'name');
            $scope.fields = _.sortBy(nameSortedFields, (field) => {
              const orderIndex = service.Class.fieldOrder ? service.Class.fieldOrder.indexOf(field.name) : -1;
              return (orderIndex > -1) ? orderIndex : Infinity;
            });
          })
          .catch(error => fatalError(error, location));

        // This handles the validation of the Ace Editor. Since we don't have any
        // other hooks into the editors to tell us if the content is valid or not
        // we need to use the annotations to see if they have any errors. If they
        // do then we push the field.name to aceInvalidEditor variable.
        // Otherwise we remove it.
        const loadedEditors = [];
        $scope.aceInvalidEditors = [];

        $scope.aceLoaded = function (editor) {
          if (_.contains(loadedEditors, editor)) return;
          loadedEditors.push(editor);

          editor.$blockScrolling = Infinity;

          const session = editor.getSession();
          const fieldName = editor.container.id;

          session.setTabSize(2);
          session.setUseSoftTabs(true);
          session.on('changeAnnotation', function () {
            const annotations = session.getAnnotations();
            if (_.some(annotations, { type: 'error' })) {
              if (!_.contains($scope.aceInvalidEditors, fieldName)) {
                $scope.aceInvalidEditors.push(fieldName);
              }
            } else {
              $scope.aceInvalidEditors = _.without($scope.aceInvalidEditors, fieldName);
            }

            if (!$rootScope.$$phase) $scope.$apply();
          });
        };

        $scope.cancel = function () {
          $window.history.back();
          return false;
        };

        /**
       * Deletes an object and sets the notification
       * @param {type} name description
       * @returns {type} description
       */
        $scope.delete = function () {
          function doDelete() {
            savedObjectsClient.delete(service.type, $routeParams.id)
              .then(function () {
                return redirectHandler('deleted');
              })
              .catch(error => fatalError(error, location));
          }
          const confirmModalOptions = {
            onConfirm: doDelete,
            confirmButtonText: i18n('kbn.management.objects.confirmModalOptions.deleteButtonLabel', {
              defaultMessage: 'Delete',
            }),
            title: i18n('kbn.management.objects.confirmModalOptions.modalTitle', {
              defaultMessage: 'Delete saved Kibana object?'
            }),
          };
          confirmModal(
            i18n('kbn.management.objects.confirmModalOptions.modalDescription', {
              defaultMessage: 'You can\'t recover deleted objects',
            }),
            confirmModalOptions
          );
        };

        $scope.submit = function () {
          const source = _.cloneDeep($scope.obj.attributes);

          _.each($scope.fields, function (field) {
            let value = field.value;

            if (field.type === 'number') {
              value = Number(field.value);
            }

            if (field.type === 'array') {
              value = JSON.parse(field.value);
            }

            _.set(source, field.name, value);
          });

          const { references, ...attributes } = source;

          savedObjectsClient.update(service.type, $routeParams.id, attributes, { references })
            .then(function () {
              return redirectHandler('updated');
            })
            .catch(error => fatalError(error, location));
        };

        function redirectHandler(action) {
          $location.path('/management/kibana/objects').search({
            _a: rison.encode({
              tab: serviceObj.title
            })
          });

          toastNotifications.addSuccess(`${_.capitalize(action)} '${$scope.obj.attributes.title}' ${$scope.title.toLowerCase()} object`);
        }
      }
    };
  });
