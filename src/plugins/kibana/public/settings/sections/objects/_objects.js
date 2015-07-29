define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var saveAs = require('@spalger/filesaver').saveAs;
  var registry = require('plugins/kibana/settings/saved_object_registry');
  var objectIndexHTML = require('plugins/kibana/settings/sections/objects/_objects.html');

  require('ui/directives/file_upload');

  require('ui/routes')
  .when('/settings/objects', {
    template: objectIndexHTML
  });

  require('ui/modules').get('apps/settings')
  .directive('kbnSettingsObjects', function (kbnIndex, Notifier, Private, kbnUrl, Promise) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $q, AppState, es) {
        var notify = new Notifier({ location: 'Saved Objects' });

        var $state = $scope.state = new AppState();
        $scope.currentTab = null;
        $scope.selectedItems = [];

        var getData = function (filter) {
          var services = registry.all().map(function (obj) {
            var service = $injector.get(obj.service);
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
            $scope.services = _.sortBy(data, 'title');
            var tab = $scope.services[0];
            if ($state.tab) $scope.currentTab = tab = _.find($scope.services, {title: $state.tab});

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
          var i = $scope.selectedItems.indexOf(item);
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
          var params = {
            service: service.serviceName,
            id: item.id
          };

          kbnUrl.change('/settings/objects/{{ service }}/{{ id }}', params);
        };

        $scope.bulkDelete = function () {
          $scope.currentTab.service.delete(_.pluck($scope.selectedItems, 'id')).then(refreshData);
        };

        $scope.bulkExport = function () {
          var objs = $scope.selectedItems.map(_.partialRight(_.extend, {type: $scope.currentTab.type}));
          retrieveAndExportDocs(objs);
        };

        $scope.exportAll = function () {
          var objs = $scope.services.map(function (service) {
            return service.data.map(_.partialRight(_.extend, {type: service.type}));
          });
          retrieveAndExportDocs(_.flattenDeep(objs));
        };

        function retrieveAndExportDocs(objs) {
          es.mget({
            index: kbnIndex,
            body: {docs: objs.map(transformToMget)}
          })
          .then(function (response) {
            saveToFile(response.docs.map(_.partialRight(_.pick, '_id', '_type', '_source')));
          });
        }

        // Takes an object and returns the associated data needed for an mget API request
        function transformToMget(obj) {
          return {_id: obj.id, _type: obj.type};
        }

        function saveToFile(results) {
          var blob = new Blob([angular.toJson(results, true)], {type: 'application/json'});
          saveAs(blob, 'export.json');
        }

        $scope.importAll = function (fileContents) {
          var docs;
          try {
            docs = JSON.parse(fileContents);
          } catch (e) {
            notify.error('The file could not be processed.');
          }

          return Promise.map(docs, function (doc) {
            var service = _.find($scope.services, {type: doc._type}).service;
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
});
