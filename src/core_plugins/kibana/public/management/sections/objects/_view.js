import _ from 'lodash';
import angular from 'angular';
import rison from 'rison-node';
import registry from 'plugins/kibana/management/saved_object_registry';
import objectViewHTML from 'plugins/kibana/management/sections/objects/_view.html';
import IndexPatternsCastMappingTypeProvider from 'ui/index_patterns/_cast_mapping_type';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';

uiRoutes
.when('/management/kibana/objects/:service/:id', {
  template: objectViewHTML
});

uiModules.get('apps/management')
.directive('kbnManagementObjectsView', function (kbnIndex, Notifier, confirmModal) {
  return {
    restrict: 'E',
    controller: function ($scope, $injector, $routeParams, $location, $window, $rootScope, esAdmin, Private) {
      const notify = new Notifier({ location: 'SavedObject view' });
      const castMappingType = Private(IndexPatternsCastMappingTypeProvider);
      const serviceObj = registry.get($routeParams.service);
      const service = $injector.get(serviceObj.service);

      /**
       * Creates a field definition and pushes it to the memo stack. This function
       * is designed to be used in conjunction with _.reduce(). If the
       * values is plain object it will recurse through all the keys till it hits
       * a string, number or an array.
       *
       * @param {array} memo The stack of fields
       * @param {mixed} value The value of the field
       * @param {string} key The key of the field
       * @param {object} collection This is a reference the collection being reduced
       * @param {array} parents The parent keys to the field
       * @returns {array}
       */
      const createField = function (memo, val, key, collection, parents) {
        if (_.isArray(parents)) {
          parents.push(key);
        } else {
          parents = [key];
        }

        const field = { type: 'text', name: parents.join('.'), value: val };

        if (_.isString(field.value)) {
          try {
            field.value = angular.toJson(JSON.parse(field.value), true);
            field.type = 'json';
          } catch (err) {
            field.value = field.value;
          }
        } else if (_.isNumeric(field.value)) {
          field.type = 'number';
        } else if (_.isArray(field.value)) {
          field.type = 'array';
          field.value = angular.toJson(field.value, true);
        } else if (_.isBoolean(field.value)) {
          field.type = 'boolean';
          field.value = field.value;
        } else if (_.isPlainObject(field.value)) {
          // do something recursive
          return _.reduce(field.value, _.partialRight(createField, parents), memo);
        }

        memo.push(field);

        // once the field is added to the object you need to pop the parents
        // to remove it since we've hit the end of the branch.
        parents.pop();
        return memo;
      };

      const readObjectClass = function (fields, Class) {
        const fieldMap = _.indexBy(fields, 'name');

        _.forOwn(Class.mapping, function (esType, name) {
          if (fieldMap[name]) return;

          fields.push({
            name: name,
            type: (function () {
              switch (castMappingType(esType)) {
                case 'string': return 'text';
                case 'number': return 'number';
                case 'boolean': return 'boolean';
                default: return 'json';
              }
            }())
          });
        });

        if (Class.searchSource && !fieldMap['kibanaSavedObjectMeta.searchSourceJSON']) {
          fields.push({
            name: 'kibanaSavedObjectMeta.searchSourceJSON',
            type: 'json',
            value: '{}'
          });
        }
      };

      $scope.notFound = $routeParams.notFound;

      $scope.title = service.type;

      esAdmin.get({
        index: kbnIndex,
        type: service.type,
        id: $routeParams.id
      })
      .then(function (obj) {
        $scope.obj = obj;
        $scope.link = service.urlFor(obj._id);

        const fields =  _.reduce(obj._source, createField, []);
        if (service.Class) readObjectClass(fields, service.Class);

        // sorts twice since we want numerical sort to prioritize over name,
        // and sortBy will do string comparison if trying to match against strings
        const nameSortedFields = _.sortBy(fields, 'name');
        $scope.fields = _.sortBy(nameSortedFields, (field) => {
          const orderIndex = service.Class.fieldOrder ? service.Class.fieldOrder.indexOf(field.name) : -1;
          return (orderIndex > -1) ? orderIndex : Infinity;
        });
      })
      .catch(notify.fatal);

      // This handles the validation of the Ace Editor. Since we don't have any
      // other hooks into the editors to tell us if the content is valid or not
      // we need to use the annotations to see if they have any errors. If they
      // do then we push the field.name to aceInvalidEditor variable.
      // Otherwise we remove it.
      const loadedEditors = [];
      $scope.aceInvalidEditors = [];

      $scope.aceLoaded = function (editor) {
        if (_.contains(loadedEditors, editor)) return;
        loadedEditors.push(editor);

        editor.$blockScrolling = Infinity;

        const session = editor.getSession();
        const fieldName = editor.container.id;

        session.setTabSize(2);
        session.setUseSoftTabs(true);
        session.on('changeAnnotation', function () {
          const annotations = session.getAnnotations();
          if (_.some(annotations, { type: 'error' })) {
            if (!_.contains($scope.aceInvalidEditors, fieldName)) {
              $scope.aceInvalidEditors.push(fieldName);
            }
          } else {
            $scope.aceInvalidEditors = _.without($scope.aceInvalidEditors, fieldName);
          }

          if ($rootScope.$$phase) $scope.$apply();
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
        function doDelete() {
          esAdmin.delete({
            index: kbnIndex,
            type: service.type,
            id: $routeParams.id
          })
            .then(function () {
              return redirectHandler('deleted');
            })
            .catch(notify.fatal);
        }
        const confirmModalOptions = {
          onConfirm: doDelete,
          confirmButtonText: 'Delete object'
        };
        confirmModal(
          'Are you sure want to delete this object? This action is irreversible!',
          confirmModalOptions
        );
      };

      $scope.submit = function () {
        const source = _.cloneDeep($scope.obj._source);

        _.each($scope.fields, function (field) {
          let value = field.value;

          if (field.type === 'number') {
            value = Number(field.value);
          }

          if (field.type === 'array') {
            value = JSON.parse(field.value);
          }

          _.set(source, field.name, value);
        });

        esAdmin.index({
          index: kbnIndex,
          type: service.type,
          id: $routeParams.id,
          body: source
        })
        .then(function () {
          return redirectHandler('updated');
        })
        .catch(notify.fatal);
      };

      function redirectHandler(action) {
        return esAdmin.indices.refresh({
          index: kbnIndex
        })
        .then(function () {
          const msg = 'You successfully ' + action + ' the "' + $scope.obj._source.title + '" ' + $scope.title.toLowerCase() + ' object';

          $location.path('/management/kibana/objects').search({
            _a: rison.encode({
              tab: serviceObj.title
            })
          });
          notify.info(msg);
        });
      }
    }
  };
});
