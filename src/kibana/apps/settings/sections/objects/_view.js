define(function (require) {
  var _ = require('lodash');
  var inflection = require('inflection');
  var rison = require('utils/rison');
  var registry = require('apps/settings/saved_object_registry');
  var objectViewHTML = require('text!apps/settings/sections/objects/_view.html');

  require('routes')
  .when('/settings/objects/:service/:id', {
    template: objectViewHTML
  });

  require('modules').get('apps/settings')
  .directive('kbnSettingsObjectsView', function (config, Notifier) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $routeParams, $location, $window, $rootScope) {

        var serviceObj = registry.get($routeParams.service);
        var service = $injector.get(serviceObj.service);

        /**
         * Creates a field definition and pushes it to the memo stack. This function
         * is designed to be used in conjunction with _.reduce(). If the
         * values is plain object it will recurse through all the keys till it hits
         * a string, number or an array.
         *
         * @param {array} memo The stack of fields
         * @param {mixed} value The value of the field
         * @param {stirng} key The key of the field
         * @param {object} collection This is a reference the collection being reduced
         * @param {array} parents The parent keys to the field
         * @returns {array}
         */
        var createField = function (memo, val, key, collection, parents) {
          if (_.isArray(parents))  {
            parents.push(key);
          } else {
            parents = [key];
          }

          var field = { type: 'text', name: parents.join('.'), value: val };

          if (_.isString(field.value)) {
            try {
              field.value = JSON.stringify(JSON.parse(field.value), null, '  ');
              field.type = 'json';
            } catch (err) {
              field.value = field.value;
            }
          } else if (_.isNumeric(field.value)) {
            field.type = 'number';
          } else if (_.isArray(field.value)) {
            field.type = 'array';
            field.value = JSON.stringify(field.value, null, ' ');
          } else if (_.isPlainObject(field.value)) {
            // do something recursive
            return _.reduce(field.value, _.partialRight(createField, parents), memo);
          } else {
            return;
          }

          memo.push(field);

          // once the field is added to the object you need to pop the parents
          // to remove it since we've hit the end of the branch.
          parents.pop();
          return memo;
        };

        $scope.title = inflection.singularize(serviceObj.title);

        service.get($routeParams.id).then(function (obj) {
          $scope.obj = obj;
          $scope.link = service.urlFor(obj.id);
          $scope.fields = _.reduce(obj._source, createField, []);
        });

        // This handles the validation of the Ace Editor. Since we don't have any
        // other hooks into the editors to tell us if the content is valid or not
        // we need to use the annotations to see if they have any errors. If they
        // do then we push the field.name to aceInvalidEditor variable.
        // Otherwise we remove it.
        $scope.aceInvalidEditors = [];
        var loadedEditors = [];
        $scope.aceLoaded = function (editor) {
          if (_.contains(loadedEditors, editor)) return;
          loadedEditors.push(editor);

          var session = editor.getSession();
          var fieldName = editor.container.id;

          session.setTabSize(2);
          session.setUseSoftTabs(true);
          session.on('changeAnnotation', function () {
            var annotations = session.getAnnotations();
            if (_.some(annotations, { type: 'error'})) {
              if (!_.contains($scope.aceInvalidEditors, fieldName)) {
                $scope.aceInvalidEditors.push(fieldName);
              }
            } else {
              $scope.aceInvalidEditors = _.without($scope.aceInvalidEditors, fieldName);
            }
            $rootScope.$$phase || $scope.$apply();
          });
        };

        $scope.cancel = function () {
          $window.history.back();
          return false;
        };

        /**
         * Deletes an object and sets the notification
         * @param {type} name description
         * @returns {type} description
         */
        $scope.delete = function () {
          $scope.obj.delete().then(function (resp) {
            $location.path('/settings/objects').search({ _a: rison.encode({
              tab: serviceObj.title
            })});
            var notify = new Notifier();
            notify.info('You successfully deleted the "' + $scope.obj.title + '" ' + $scope.title.toLowerCase() + ' object');
          });
        };

        $scope.submit = function () {
          var source = _.cloneDeep($scope.obj._source);
          var value;

          _.each($scope.fields, function (field) {
            switch (field.type) {
              case 'number':
                value = Number(field.value);
                break;
              case 'array':
                value = JSON.parse(field.value);
                break;
              default:
                value = field.value;
            }
            _.setValue(source, field.name, field.value);
          });

          $scope.obj.saveSource(source).then(function (resp) {
            $location.path('/settings/objects').search({ _a: rison.encode({
              tab: serviceObj.title
            })});
            var notify = new Notifier();
            notify.info('You successfully updated the "' + $scope.obj.title + '" ' + $scope.title.toLowerCase() + ' object');
          });
        };

      }
    };
  });
});
