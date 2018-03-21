import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import objectIndexHTML from 'plugins/kibana/management/sections/objects/_objects.html';
import uiRoutes from 'ui/routes';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { uiModules } from 'ui/modules';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ObjectsTable } from './components/objects_table';

const REACT_OBJECTS_TABLE_DOM_ELEMENT_ID = 'reactSavedObjectsTable';

function updateObjectsTable($scope, savedObjectsClient, services, indexPatterns, $http, kbnIndex, kbnUrl) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_OBJECTS_TABLE_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <ObjectsTable
        savedObjectsClient={savedObjectsClient}
        services={services}
        indexPatterns={indexPatterns}
        $http={$http}
        kbnIndex={kbnIndex}
        newIndexPatternUrl={kbnUrl.eval('#/management/kibana/index')}
      />,
      node,
    );
  });
}

function destroyObjectsTable() {
  const node = document.getElementById(REACT_OBJECTS_TABLE_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

uiRoutes
  .when('/management/kibana/objects', { template: objectIndexHTML })
  .when('/management/kibana/objects/:service', { redirectTo: '/management/kibana/objects' });

uiModules.get('apps/management')
  .directive('kbnManagementObjects', function ($http, kbnIndex, kbnUrl, Private, indexPatterns) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    return {
      restrict: 'E',
      controllerAs: 'managementObjectsController',
      controller: function ($scope, $injector) {
        const services = savedObjectManagementRegistry.all().map(obj => $injector.get(obj.service));
        updateObjectsTable($scope, savedObjectsClient, services, indexPatterns, $http, kbnIndex, kbnUrl);
        $scope.$on('$destroy', destroyObjectsTable);
      }
    };
  });
