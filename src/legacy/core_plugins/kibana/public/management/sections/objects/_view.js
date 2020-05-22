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
import { render, unmountComponentAtNode } from 'react-dom';
import 'angular';
import 'angular-elastic/elastic';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import objectViewHTML from './_view.html';
import { getViewBreadcrumbs } from './breadcrumbs';
import { savedObjectManagementRegistry } from '../../saved_object_registry';
import { SavedObjectEdition } from './saved_object_view';

const REACT_OBJECTS_VIEW_DOM_ELEMENT_ID = 'reactSavedObjectsView';

uiRoutes.when('/management/kibana/objects/:service/:id', {
  template: objectViewHTML,
  k7Breadcrumbs: getViewBreadcrumbs,
  requireUICapability: 'management.kibana.objects',
});

function createReactView($scope, $routeParams) {
  const { service: serviceName, id: objectId, notFound } = $routeParams;

  const { savedObjects, overlays, notifications, application } = npStart.core;

  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_OBJECTS_VIEW_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <SavedObjectEdition
          id={objectId}
          serviceName={serviceName}
          serviceRegistry={savedObjectManagementRegistry}
          savedObjectsClient={savedObjects.client}
          overlays={overlays}
          notifications={notifications}
          capabilities={application.capabilities}
          notFoundType={notFound}
        />
      </I18nContext>,
      node
    );
  });
}

function destroyReactView() {
  const node = document.getElementById(REACT_OBJECTS_VIEW_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

uiModules
  .get('apps/management', ['monospaced.elastic'])
  .directive('kbnManagementObjectsView', function () {
    return {
      restrict: 'E',
      controller: function ($scope, $routeParams) {
        createReactView($scope, $routeParams);
        $scope.$on('$destroy', destroyReactView);
      },
    };
  });
