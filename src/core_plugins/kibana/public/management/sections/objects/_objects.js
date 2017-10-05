import { saveAs } from '@elastic/filesaver';
import { find, flattenDeep, pluck, sortBy } from 'lodash';
import angular from 'angular';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import objectIndexHTML from 'plugins/kibana/management/sections/objects/_objects.html';
import 'ui/directives/file_upload';
import uiRoutes from 'ui/routes';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { uiModules } from 'ui/modules';
import { showChangeIndexModal } from './show_change_index_modal';
import { SavedObjectNotFound } from 'ui/errors';

const indexPatternsResolutions = {
  indexPatterns: function (Private) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);

    return savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    }).then(response => response.savedObjects);
  }
};

uiRoutes
.when('/management/kibana/objects', {
  template: objectIndexHTML,
  resolve: indexPatternsResolutions
});

uiRoutes
.when('/management/kibana/objects/:service', {
  redirectTo: '/management/kibana/objects'
});

uiModules.get('apps/management')
.directive('kbnManagementObjects', function ($route, kbnIndex, Notifier, Private, kbnUrl, Promise, confirmModal) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  return {
    restrict: 'E',
    controllerAs: 'managementObjectsController',
    controller: function ($scope, $injector, $q, AppState) {
      const notify = new Notifier({ location: 'Saved Objects' });

      // TODO: Migrate all scope variables to the controller.
      const $state = $scope.state = new AppState();
      $scope.currentTab = null;
      $scope.selectedItems = [];

      this.areAllRowsChecked = function areAllRowsChecked() {
        if ($scope.currentTab.data.length === 0) {
          return false;
        }
        return $scope.selectedItems.length === $scope.currentTab.data.length;
      };

      const getData = function (filter) {
        const services = savedObjectManagementRegistry.all().map(function (obj) {
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
          if ($state.tab) $scope.currentTab = find($scope.services, { title: $state.tab });

          $scope.$watch('state.tab', function (tab) {
            if (!tab) $scope.changeTab($scope.services[0]);
          });
        });
      };

      const refreshData = () => {
        return getData(this.advancedFilter);
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.toggleAll = function () {
        if ($scope.selectedItems.length === $scope.currentTab.data.length) {
          $scope.selectedItems.length = 0;
        } else {
          $scope.selectedItems = [].concat($scope.currentTab.data);
        }
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.toggleItem = function (item) {
        const i = $scope.selectedItems.indexOf(item);
        if (i >= 0) {
          $scope.selectedItems.splice(i, 1);
        } else {
          $scope.selectedItems.push(item);
        }
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.open = function (item) {
        kbnUrl.change(item.url.substr(1));
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.edit = function (service, item) {
        const params = {
          service: service.serviceName,
          id: item.id
        };

        kbnUrl.change('/management/kibana/objects/{{ service }}/{{ id }}', params);
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.bulkDelete = function () {
        function doBulkDelete() {
          $scope.currentTab.service.delete(pluck($scope.selectedItems, 'id'))
            .then(refreshData)
            .then(function () {
              $scope.selectedItems.length = 0;
            })
            .catch(error => notify.error(error));
        }

        const confirmModalOptions = {
          confirmButtonText: `Delete ${$scope.currentTab.title}`,
          onConfirm: doBulkDelete
        };
        confirmModal(
          `Are you sure you want to delete the selected ${$scope.currentTab.title}? This action is irreversible!`,
          confirmModalOptions
        );
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.bulkExport = function () {
        const objs = $scope.selectedItems.map(item => {
          return { type: $scope.currentTab.type, id: item.id };
        });

        retrieveAndExportDocs(objs);
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.exportAll = () => Promise
        .map($scope.services, service => service.service
          .scanAll('')
          .then(result => result.hits)
        )
        .then(results => saveToFile(flattenDeep(results)))
        .catch(error => notify.error(error));

      function retrieveAndExportDocs(objs) {
        if (!objs.length) return notify.error('No saved objects to export.');

        savedObjectsClient.bulkGet(objs)
          .then(function (response) {
            saveToFile(response.savedObjects.map(obj => {
              return {
                _id: obj.id,
                _type: obj.type,
                _source: obj.attributes
              };
            }));
          });
      }

      function saveToFile(results) {
        const blob = new Blob([angular.toJson(results, true)], { type: 'application/json' });
        saveAs(blob, 'export.json');
      }

      // TODO: Migrate all scope methods to the controller.
      $scope.importAll = function (fileContents) {
        let docs;
        try {
          docs = JSON.parse(fileContents);
        } catch (e) {
          notify.error('The file could not be processed.');
          return;
        }

        // make sure we have an array, show an error otherwise
        if (!Array.isArray(docs)) {
          notify.error('Saved objects file format is invalid and cannot be imported.');
          return;
        }

        return new Promise((resolve) => {
          confirmModal(
            `If any of the objects already exist, do you want to automatically overwrite them?`, {
              confirmButtonText: `Yes, overwrite all`,
              cancelButtonText: `No, prompt me for each one`,
              onConfirm: () => resolve(true),
              onCancel: () => resolve(false),
            }
          );
        })
        .then((overwriteAll) => {
          const conflictedIndexPatterns = [];

          function importDocument(doc) {
            const { service } = find($scope.services, { type: doc._type }) || {};

            if (!service) {
              const msg = `Skipped import of "${doc._source.title}" (${doc._id})`;
              const reason = `Invalid type: "${doc._type}"`;

              notify.warning(`${msg}, ${reason}`, {
                lifetime: 0,
              });

              return;
            }

            return service.get()
              .then(function (obj) {
                obj.id = doc._id;
                return obj.applyESResp(doc)
                  .then(() => {
                    return obj.save({ confirmOverwrite : !overwriteAll });
                  })
                  .catch((err) => {
                    if (err instanceof SavedObjectNotFound && err.savedObjectType === 'index-pattern') {
                      conflictedIndexPatterns.push({ obj, doc });
                      return;
                    }

                    // swallow errors here so that the remaining promise chain executes
                    err.message = `Importing ${obj.title} (${obj.id}) failed: ${err.message}`;
                    notify.error(err);
                  });
              });
          }

          function groupByType(docs) {
            const defaultDocTypes = {
              searches: [],
              other: [],
            };

            return docs.reduce((types, doc) => {
              switch (doc._type) {
                case 'search':
                  types.searches.push(doc);
                  break;
                default:
                  types.other.push(doc);
              }
              return types;
            }, defaultDocTypes);
          }

          const docTypes = groupByType(docs);

          return Promise.map(docTypes.searches, importDocument)
            .then(() => Promise.map(docTypes.other, importDocument))
            .then(() => {
              if (conflictedIndexPatterns.length) {
                showChangeIndexModal(
                  (objs) => {
                    return Promise.map(
                      conflictedIndexPatterns,
                      ({ obj }) => {
                        const oldIndexId = obj.searchSource.getOwn('index');
                        const newIndexId = objs.find(({ oldId }) => oldId === oldIndexId).newId;
                        if (newIndexId === oldIndexId) {
                          // Skip
                          return;
                        }
                        return obj.hydrateIndexPattern(newIndexId)
                          .then(() => obj.save({ confirmOverwrite : !overwriteAll }));
                      }
                    ).then(refreshData);
                  },
                  conflictedIndexPatterns,
                  $route.current.locals.indexPatterns,
                );
              } else {
                return refreshData();
              }
            })
            .catch(notify.error);
        });
      };

      // TODO: Migrate all scope methods to the controller.
      $scope.changeTab = function (tab) {
        $scope.currentTab = tab;
        $scope.selectedItems.length = 0;
        $state.tab = tab.title;
        $state.save();
      };

      $scope.$watch('managementObjectsController.advancedFilter', function (filter) {
        getData(filter);
      });
    }
  };
});
