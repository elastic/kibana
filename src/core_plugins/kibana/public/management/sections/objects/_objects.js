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

const REACT_OBJECTS_TABLE_DOM_ELEMENT_ID = 'reactSavedObjectsTable';

function updateObjectsTable($scope, $injector) {
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
            toastNotifications.addWarning(`Unknown saved object type: ${type}`);
            return null;
          }

          return kbnUrl.eval(`#/management/kibana/objects/${serviceName}/${id}`);
        }}
        goInApp={(id, type) => {
          kbnUrl.change(getInAppUrl(id, type));
          $scope.$apply();
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
  .directive('kbnManagementObjects', function () {
    return {
      restrict: 'E',
      controllerAs: 'managementObjectsController',
      controller: function ($scope, $injector) {
        updateObjectsTable($scope, $injector);
        $scope.$on('$destroy', destroyObjectsTable);
      }
    };
  });
