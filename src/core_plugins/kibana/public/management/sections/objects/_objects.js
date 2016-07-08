import { saveAs } from '@spalger/filesaver';
import { extend, find, flattenDeep, partialRight, pick, pluck, sortBy } from 'lodash';
import angular from 'angular';
import registry from 'plugins/kibana/management/saved_object_registry';
import objectIndexHTML from 'plugins/kibana/management/sections/objects/_objects.html';
import 'ui/directives/file_upload';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';

const MAX_SIZE = Math.pow(2, 31) - 1;

uiRoutes
.when('/management/kibana/objects', {
  template: objectIndexHTML
});

uiModules.get('apps/management')
.directive('kbnManagementObjects', function (kbnIndex, Notifier, Private, kbnUrl, Promise) {
  return {
    restrict: 'E',
    controller: function ($scope, $injector, $q, AppState, es) {
      const notify = new Notifier({ location: 'Saved Objects' });

      const $state = $scope.state = new AppState();
      $scope.currentTab = null;
      $scope.selectedItems = [];

      const getData = function (filter) {
        const services = registry.all().map(function (obj) {
          const service = $injector.get(obj.service);
          return service.find(filter).then(function (data) {
            return {
              service: service,
              serviceName: obj.service,
              title: obj.title,
              type: service.type,
              data: data.hits,
              total: data.total
            };
          });
        });

        $q.all(services).then(function (data) {
          $scope.services = sortBy(data, 'title');
          let tab = $scope.services[0];
          if ($state.tab) $scope.currentTab = tab = find($scope.services, {title: $state.tab});

          $scope.$watch('state.tab', function (tab) {
            if (!tab) $scope.changeTab($scope.services[0]);
          });
        });
      };


      $scope.toggleAll = function () {
        if ($scope.selectedItems.length === $scope.currentTab.data.length) {
          $scope.selectedItems.length = 0;
        } else {
          $scope.selectedItems = [].concat($scope.currentTab.data);
        }
      };

      $scope.toggleItem = function (item) {
        const i = $scope.selectedItems.indexOf(item);
        if (i >= 0) {
          $scope.selectedItems.splice(i, 1);
        } else {
          $scope.selectedItems.push(item);
        }
      };

      $scope.open = function (item) {
        kbnUrl.change(item.url.substr(1));
      };

      $scope.edit = function (service, item) {
        const params = {
          service: service.serviceName,
          id: item.id
        };

        kbnUrl.change('/management/kibana/objects/{{ service }}/{{ id }}', params);
      };

      $scope.bulkDelete = function () {
        $scope.currentTab.service.delete(pluck($scope.selectedItems, 'id'))
        .then(refreshData)
        .then(function () {
          $scope.selectedItems.length = 0;
        })
        .catch(error => notify.error(error));
      };

      $scope.bulkExport = function () {
        const objs = $scope.selectedItems.map(partialRight(extend, {type: $scope.currentTab.type}));
        retrieveAndExportDocs(objs);
      };

      $scope.exportAll = () => Promise
        .map($scope.services, service => service.service
          .scanAll('')
          .then(result => result.hits.map(hit => extend(hit, { type: service.type })))
        )
        .then(results => retrieveAndExportDocs(flattenDeep(results)))
        .catch(error => notify.error(error));

      function retrieveAndExportDocs(objs) {
        if (!objs.length) return notify.error('No saved objects to export.');
        es.mget({
          index: kbnIndex,
          body: {docs: objs.map(transformToMget)}
        })
        .then(function (response) {
          saveToFile(response.docs.map(partialRight(pick, '_id', '_type', '_source')));
        });
      }

      // Takes an object and returns the associated data needed for an mget API request
      function transformToMget(obj) {
        return {_id: obj.id, _type: obj.type};
      }

      function saveToFile(results) {
        const blob = new Blob([angular.toJson(results, true)], {type: 'application/json'});
        saveAs(blob, 'export.json');
      }

      $scope.importAll = function (fileContents) {
        let docs;
        try {
          docs = JSON.parse(fileContents);
        } catch (e) {
          notify.error('The file could not be processed.');
        }

        return Promise.map(docs, function (doc) {
          const service = find($scope.services, {type: doc._type}).service;
          return service.get().then(function (obj) {
            obj.id = doc._id;
            return obj.applyESResp(doc).then(function () {
              return obj.save();
            });
          });
        })
        .then(refreshIndex)
        .then(refreshData, notify.error);
      };

      function refreshIndex() {
        return es.indices.refresh({
          index: kbnIndex
        });
      }

      function refreshData() {
        return getData($scope.advancedFilter);
      }

      $scope.changeTab = function (tab) {
        $scope.currentTab = tab;
        $scope.selectedItems.length = 0;
        $state.tab = tab.title;
        $state.save();
      };

      $scope.$watch('advancedFilter', function (filter) {
        getData(filter);
      });
    }
  };
});
