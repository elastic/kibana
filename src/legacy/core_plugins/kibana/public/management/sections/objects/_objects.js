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
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { uiModules } from 'ui/modules';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ObjectsTable } from './components/objects_table';
import { I18nContext } from 'ui/i18n';
import { get } from 'lodash';
import { npStart } from 'ui/new_platform';

import { getIndexBreadcrumbs } from './breadcrumbs';

const REACT_OBJECTS_TABLE_DOM_ELEMENT_ID = 'reactSavedObjectsTable';

function updateObjectsTable($scope, $injector) {
  const Private = $injector.get('Private');
  const indexPatterns = npStart.plugins.data.indexPatterns;
  const $http = $injector.get('$http');
  const kbnUrl = $injector.get('kbnUrl');
  const config = $injector.get('config');
  const confirmModalPromise = $injector.get('confirmModalPromise');

  const savedObjectsClient = Private(SavedObjectsClientProvider);
  const services = savedObjectManagementRegistry.all().map(obj => obj.service);
  const uiCapabilites = npStart.core.application.capabilities;

  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_OBJECTS_TABLE_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <ObjectsTable
          savedObjectsClient={savedObjectsClient}
          confirmModalPromise={confirmModalPromise}
          services={services}
          indexPatterns={indexPatterns}
          $http={$http}
          perPageConfig={config.get('savedObjects:perPage')}
          basePath={chrome.getBasePath()}
          newIndexPatternUrl={kbnUrl.eval('#/management/kibana/index_pattern')}
          uiCapabilities={uiCapabilites}
          goInspectObject={object => {
            if (object.meta.editUrl) {
              kbnUrl.change(object.meta.editUrl);
              $scope.$apply();
            }
          }}
          canGoInApp={object => {
            const { inAppUrl } = object.meta;
            return inAppUrl && get(uiCapabilites, inAppUrl.uiCapabilitiesPath);
          }}
        />
      </I18nContext>,
      node
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
    k7Breadcrumbs: getIndexBreadcrumbs,
    requireUICapability: 'management.kibana.objects',
  })
  .when('/management/kibana/objects/:service', {
    redirectTo: '/management/kibana/objects',
  });

uiModules.get('apps/management').directive('kbnManagementObjects', function() {
  return {
    restrict: 'E',
    controllerAs: 'managementObjectsController',
    controller: function($scope, $injector) {
      updateObjectsTable($scope, $injector);
      $scope.$on('$destroy', destroyObjectsTable);
    },
  };
});
