import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import objectIndexHTML from 'plugins/kibana/management/sections/objects/_objects.html';
import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { uiModules } from 'ui/modules';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ObjectsTable } from './components/objects_table';

const REACT_OBJECTS_TABLE_DOM_ELEMENT_ID = 'reactSavedObjectsTable';

function updateObjectsTable($scope, savedObjectsClient, services, indexPatterns, $http, kbnIndex, kbnUrl) {
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
      <ObjectsTable
        savedObjectsClient={savedObjectsClient}
        services={services}
        indexPatterns={indexPatterns}
        $http={$http}
        basePath={chrome.getBasePath()}
        kbnIndex={kbnIndex}
        newIndexPatternUrl={kbnUrl.eval('#/management/kibana/index')}
        getDashboardUrl={id => kbnUrl.eval('#/dashboard/{{id}}', { id: id })}
        getVisualizationUrl={id => kbnUrl.eval('#/visualize/edit/{{id}}', { id: id })}
        getEditUrl={(type, id) => {
          if (type === 'index-pattern') {
            return kbnUrl.eval(`#/management/kibana/indices/${id}`);
          }
          return kbnUrl.eval(`#/management/kibana/objects/${typeToServiceName(type)}/${id}`);
        }}
        getInAppUrl={(type, id) => {
          if (type === 'index-pattern') {
            return kbnUrl.eval(`#/management/kibana/indices/${id}`);
          }
          if (type === 'visualization') {
            return kbnUrl.eval(`#/visualize/edit/${id}`);
          }
          if (type === 'search') {
            return kbnUrl.eval(`#/discover/${id}`);
          }
          return kbnUrl.eval(`#/${type.toLowerCase()}/${id}`);
        }}
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
