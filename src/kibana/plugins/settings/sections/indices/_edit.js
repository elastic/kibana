define(function (require) {
  var _ = require('lodash');
  require('components/paginated_table/paginated_table');

  require('routes')
  .when('/settings/indices/:id', {
    template: require('text!plugins/settings/sections/indices/_edit.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.id)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    }
  });

  require('modules').get('apps/settings')
  .controller('settingsIndicesEdit', function ($rootScope, $scope, $location, $route, config, courier, Notifier, Private, AppState) {
    var notify = new Notifier();
    var $state = $scope.state = new AppState();
    var refreshKibanaIndex = Private(require('plugins/settings/sections/indices/_refresh_kibana_index'));

    $scope.indexPattern = $route.current.locals.indexPattern;
    var otherIds = _.without($route.current.locals.indexPatternIds, $scope.indexPattern.id);

    $scope.fieldTypes = Private(require('plugins/settings/sections/indices/_field_types'));

    $scope.fieldColumns = [{
      title: 'name'
    }, {
      title: 'type'
    }, {
      title: 'analyzed',
      info: 'Analyzed fields may require extra memory to visualize'
    }, {
      title: 'indexed',
      info: 'Fields that are not indexed are unavailable for search'
    }, {
      title: 'popularity',
      info: 'A gauge of how often this field is used',
    }];

    $scope.$watchCollection('indexPattern.fields', function () {
      $scope.fieldRows = $scope.indexPattern.fields.map(function (field) {
        var childScope = $scope.$new();
        childScope.field = field;

        return [field.name, field.type, field.analyzed, field.indexed,
          {
            markup:
              '<div ng-mouseover="hoverState = true" ng-mouseout="hoverState = false">' +
                '<span>{{ field.count }}</span> ' +
                '<span class="field-popularize" ng-show="hoverState">' +
                  ' <span ng-click="indexPattern.popularizeField(field.name, 1)" ' +
                    'class="label label-default"><i class="fa fa-plus"></i></span>' +
                  ' <span ng-click="indexPattern.popularizeField(field.name, -1)" ' +
                    'class="label label-default"><i class="fa fa-minus"></i></span>' +
                '</span>' +
              '</div>',
            scope: childScope
          }
        ];
      });
    });


    $scope.perPage = 25;

    $scope.changeTab = function (obj) {
      $state.tab = obj.index;
      $state.save();
    };

    if (!$state.tab) {
      $scope.changeTab($scope.fieldTypes[0]);
    }

    $scope.conflictFields = _.filter($scope.indexPattern.fields, {type: 'conflict'});

    $scope.refreshFields = function () {
      $scope.indexPattern.refreshFields();
    };

    $scope.removePattern = function () {
      if ($scope.indexPattern.id === config.get('defaultIndex')) {
        config.delete('defaultIndex');
        if (otherIds.length) {
          config.set('defaultIndex', otherIds[0]);
        }
      }

      courier.indexPatterns.delete($scope.indexPattern)
      .then(refreshKibanaIndex)
      .then(function () {
        $location.url('/settings/indices');
      })
      .catch(notify.fatal);
    };

    $scope.setDefaultPattern = function () {
      config.set('defaultIndex', $scope.indexPattern.id);
    };

    $scope.setIndexPatternsTimeField = function (field) {
      if (field.type !== 'date') {
        notify.error('That field is a ' + field.type + ' not a date.');
        return;
      }
      $scope.indexPattern.timeFieldName = field.name;
      return $scope.indexPattern.save();
    };
  });
});