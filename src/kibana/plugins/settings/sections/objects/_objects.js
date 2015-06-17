define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var saveAs = require('file_saver');
  var registry = require('plugins/settings/saved_object_registry');
  var objectIndexHTML = require('text!plugins/settings/sections/objects/_objects.html');

  require('directives/file_upload');

  require('routes')
  .when('/settings/objects', {
    template: objectIndexHTML
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsObjects', function (config, Notifier, Private, kbnUrl) {
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
            if ($state.tab) tab = _.find($scope.services, {title: $state.tab});
            $scope.changeTab(tab);
          });
        };

        $scope.$watch('state.tab', function (tab) {
          if (!tab) $scope.changeTab($scope.services[0]);
        });

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
          retrieveAndExportDocs(_.flatten(objs));
        };

        function retrieveAndExportDocs(objs) {
          es.mget({
            index: config.file.kibana_index,
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

          return es.mget({
            index: config.file.kibana_index,
            body: {docs: docs.map(_.partialRight(_.pick, '_id', '_type'))}
          })
          .then(function (response) {
            var existingDocs = _.where(response.docs, {found: true});
            var confirmMessage = 'The following objects will be overwritten:\n\n';
            if (existingDocs.length === 0 || window.confirm(confirmMessage + _.pluck(existingDocs, '_id').join('\n'))) {
              return es.bulk({
                index: config.file.kibana_index,
                body: _.flatten(docs.map(transformToBulk))
              })
              .then(refreshIndex)
              .then(refreshData, notify.error);
            }
          });
        };

        // Takes a doc and returns the associated two entries for an index bulk API request
        function transformToBulk(doc) {
          return [
            {index: _.pick(doc, '_id', '_type')},
            doc._source
          ];
        }

        function refreshIndex() {
          return es.indices.refresh({
            index: config.file.kibana_index
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
