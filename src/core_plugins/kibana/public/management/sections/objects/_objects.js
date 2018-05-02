import { saveAs } from '@elastic/filesaver';
import { find, flattenDeep, pluck, sortBy } from 'lodash';
import angular from 'angular';
import { savedObjectManagementRegistry } from '../../saved_object_registry';
import objectIndexHTML from './_objects.html';
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
            return service.findAll(filter).then(function (data) {
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
            confirmButtonText: 'Delete',
            onConfirm: doBulkDelete,
            title: `Delete selected ${$scope.currentTab.title}?`
          };
          confirmModal(
            `You can't recover deleted ${$scope.currentTab.title}.`,
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
              '', {
                confirmButtonText: `Yes, overwrite all objects`,
                cancelButtonText: `No, prompt for each object`,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
                title: 'Automatically overwrite all saved objects?'
              }
            );
          })
            .then((overwriteAll) => {
              // Keep a record of the index patterns assigned to our imported saved objects that do not
              // exist. We will provide a way for the user to manually select a new index pattern for those
              // saved objects.
              const conflictedIndexPatterns = [];
              // We want to do the same for saved searches, but we want to keep them separate because they need
              // to be applied _first_ because other saved objects can be depedent on those saved searches existing
              const conflictedSearchDocs = [];
              // It's possbile to have saved objects that link to saved searches which then link to index patterns
              // and those could error out, but the error comes as an index pattern not found error. We can't resolve
              // those the same as way as normal index pattern not found errors, but when those are fixed, it's very
              // likely that these saved objects will work once resaved so keep them around to resave them.
              const conflictedSavedObjectsLinkedToSavedSearches = [];

              function importDocument(swallowErrors, doc) {
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
                        return obj.save({ confirmOverwrite: !overwriteAll });
                      })
                      .catch((err) => {
                        if (swallowErrors && err instanceof SavedObjectNotFound) {
                          switch (err.savedObjectType) {
                            case 'search':
                              conflictedSearchDocs.push(doc);
                              return;
                            case 'index-pattern':
                              if (obj.savedSearchId) {
                                conflictedSavedObjectsLinkedToSavedSearches.push(obj);
                              } else {
                                conflictedIndexPatterns.push({ obj, doc });
                              }
                              return;
                          }
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

              function resolveConflicts(objs, { obj }) {
                const oldIndexId = obj.searchSource.getOwn('index');
                const newIndexId = objs.find(({ oldId }) => oldId === oldIndexId).newId;
                // If the user did not select a new index pattern in the modal, the id
                // will be same as before, so don't try to update it
                if (newIndexId === oldIndexId) {
                  return;
                }
                return obj.hydrateIndexPattern(newIndexId)
                  .then(() => saveObject(obj));
              }

              function saveObject(obj) {
                return obj.save({ confirmOverwrite: !overwriteAll });
              }

              const docTypes = groupByType(docs);

              return Promise.map(docTypes.searches, importDocument.bind(null, true))
                .then(() => Promise.map(docTypes.other, importDocument.bind(null, true)))
                .then(() => {
                  if (conflictedIndexPatterns.length) {
                    return new Promise((resolve, reject) => {
                      showChangeIndexModal(
                        (objs) => {
                          Promise.map(conflictedIndexPatterns, resolveConflicts.bind(null, objs))
                            .then(Promise.map(conflictedSavedObjectsLinkedToSavedSearches, saveObject))
                            .then(resolve)
                            .catch(reject);
                        },
                        conflictedIndexPatterns,
                        $route.current.locals.indexPatterns,
                      );
                    });
                  }
                })
                .then(() => Promise.map(conflictedSearchDocs, importDocument.bind(null, false)))
                .then(refreshData)
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
