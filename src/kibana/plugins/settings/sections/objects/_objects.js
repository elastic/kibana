define(function (require) {
  var _ = require('lodash');
  var registry = require('plugins/settings/saved_object_registry');
  var objectIndexHTML = require('text!plugins/settings/sections/objects/_objects.html');

  require('routes')
  .when('/settings/objects', {
    template: objectIndexHTML
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsObjects', function (config, Notifier, Private, kbnUrl) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $q, AppState) {

        var $state = $scope.state = new AppState();

        var resetCheckBoxes = function () {
          $scope.deleteAll = false;
          _.each($scope.services, function (service) {
            _.each(service.data, function (item) {
              item.checked = false;
            });
          });
        };

        var getData = function (filter) {
          var services = registry.all().map(function (obj) {
            var service = $injector.get(obj.service);
            return service.find(filter).then(function (data) {
              return { service: obj.service, title: obj.title, data: data.hits };
            });
          });
          $q.all(services).then(function (data) {
            $scope.services = _.sortBy(data, 'title');
            if (!$state.tab) {
              $scope.changeTab($scope.services[0]);
            }
          });
        };

        $scope.$watch('deleteAll', function (checked) {
          var service = _.find($scope.services, { title: $state.tab });
          if (!service) return;
          _.each(service.data, function (item) {
            item.checked = checked;
          });
          $scope.toggleDeleteBtn(service);
        });

        $scope.open = function (item) {
          kbnUrl.change(item.url.substr(1));
        };

        $scope.edit = function (service, item) {
          var params = {
            service: service.service,
            id: item.id
          };

          kbnUrl.change('/settings/objects/{{ service }}/{{ id }}', params);
        };

        $scope.toggleDeleteBtn = function (service) {
          $scope.deleteAllBtn = _.some(service.data, { checked: true});
        };

        $scope.bulkDelete = function () {
          var serviceObj = _.find($scope.services, { title: $state.tab });
          if (!serviceObj) return;
          var service = $injector.get(serviceObj.service);
          var ids = _(serviceObj.data)
            .filter({ checked: true})
            .pluck('id')
            .value();
          service.delete(ids).then(function (resp) {
            serviceObj.data = _.filter(serviceObj.data, function (obj) {
              return !obj.checked;
            });
            resetCheckBoxes();
          });
        };

        $scope.changeTab = function (obj) {
          $state.tab = obj.title;
          $state.save();
          resetCheckBoxes();
        };

        $scope.$watch('advancedFilter', function (filter) {
          getData(filter);
        });

      }
    };
  });
});
