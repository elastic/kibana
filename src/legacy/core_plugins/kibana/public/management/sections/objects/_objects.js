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

import { savedObjectManagementRegistry } from '../../saved_object_registry';
import objectIndexHTML from './_objects.html';
import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { uiModules } from 'ui/modules';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ObjectsTable } from './components/objects_table';
import { getInAppUrl } from './lib/get_in_app_url';
import { I18nContext } from 'ui/i18n';

import { getIndexBreadcrumbs } from './breadcrumbs';

const REACT_OBJECTS_TABLE_DOM_ELEMENT_ID = 'reactSavedObjectsTable';

function updateObjectsTable($scope, $injector, i18n) {
  const Private = $injector.get('Private');
  const indexPatterns = $injector.get('indexPatterns');
  const $http = $injector.get('$http');
  const kbnUrl = $injector.get('kbnUrl');
  const config = $injector.get('config');

  const savedObjectsClient = Private(SavedObjectsClientProvider);
  const services = savedObjectManagementRegistry.all().map(obj => $injector.get(obj.service));
  const allServices = savedObjectManagementRegistry.all();
  const typeToServiceName = type => allServices.reduce((serviceName, service) => {
    return service.title.includes(type) ? service.service : serviceName;
  }, null);

  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_OBJECTS_TABLE_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <ObjectsTable
          savedObjectsClient={savedObjectsClient}
          services={services}
          indexPatterns={indexPatterns}
          $http={$http}
          perPageConfig={config.get('savedObjects:perPage')}
          basePath={chrome.getBasePath()}
          newIndexPatternUrl={kbnUrl.eval('#/management/kibana/index')}
          getEditUrl={(id, type) => {
            if (type === 'index-pattern' || type === 'indexPatterns') {
              return kbnUrl.eval(`#/management/kibana/indices/${id}`);
            }
            const serviceName = typeToServiceName(type);
            if (!serviceName) {
              toastNotifications.addWarning(i18n('kbn.management.objects.unknownSavedObjectTypeNotificationMessage', {
                defaultMessage: 'Unknown saved object type: {type}',
                values: { type }
              }));
              return null;
            }

            return kbnUrl.eval(`#/management/kibana/objects/${serviceName}/${id}`);
          }}
          goInApp={(id, type) => {
            kbnUrl.change(getInAppUrl(id, type));
            $scope.$apply();
          }}
        />
      </I18nContext>,
      node,
    );
  });
}

function destroyObjectsTable() {
  const node = document.getElementById(REACT_OBJECTS_TABLE_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

uiRoutes
  .when('/management/kibana/objects', {
    template: objectIndexHTML,
    k7Breadcrumbs: getIndexBreadcrumbs
  })
  .when('/management/kibana/objects/:service', {
    redirectTo: '/management/kibana/objects'
  });

uiModules.get('apps/management')
  .directive('kbnManagementObjects', function () {
    return {
      restrict: 'E',
      controllerAs: 'managementObjectsController',
      controller: function ($scope, $injector, i18n) {
        updateObjectsTable($scope, $injector, i18n);
        $scope.$on('$destroy', destroyObjectsTable);
      }
    };
  });
