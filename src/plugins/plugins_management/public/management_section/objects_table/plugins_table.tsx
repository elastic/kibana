/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { debounce } from 'lodash';
// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import { EuiSpacer, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  HttpStart,
  OverlayStart,
  NotificationsStart,
  ApplicationStart,
} from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { PluginManagementSourceInfo } from '../../../common/types';
import {
  parseQuery,
  getSavedObjectCounts,
  fetchExportObjects,
  fetchExportByTypeAndSearch,
  findObjects,
  bulkGetObjects,
  extractExportDetails,
  SavedObjectsExportResultDetails,
  getTagFindReferences,
} from '../../lib';
import { SavedObjectWithMetadata } from '../../types';
import {
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceStart,
} from '../../services';
import {
  Header,
  Table,
  Flyout,
  Relationships,
  DeleteConfirmModal,
  ExportModal,
} from './components';

interface PluginDescriptor {
  pluginName: string;
  source: 'external' | 'verified';
  version: string;
}

interface ExportAllOption {
  id: string;
  label: string;
}

export interface SavedObjectsTableProps {
  allowedSources: PluginManagementSourceInfo[];
  actionRegistry: SavedObjectsManagementActionServiceStart;
  columnRegistry: SavedObjectsManagementColumnServiceStart;
  savedObjectsClient: SavedObjectsClientContract;
  dataViews: DataViewsContract;
  taggingApi?: SavedObjectsTaggingApi;
  http: HttpStart;
  search: DataPublicPluginStart['search'];
  overlays: OverlayStart;
  notifications: NotificationsStart;
  applications: ApplicationStart;
  perPageConfig: number;
  goInspectObject: (obj: SavedObjectWithMetadata) => void;
  canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
  initialQuery?: Query;
}

export interface SavedObjectsTableState {
  totalCount: number;
  page: number;
  perPage: number;
  plugins: PluginDescriptor[];
  savedObjectCounts: Record<string, number>;
  activeQuery: Query;
  // selectedSavedObjects: SavedObjectWithMetadata[];
  isShowingImportFlyout: boolean;
  isSearching: boolean;
  filteredItemCount: number;
  isShowingRelationships: boolean;
  // relationshipObject?: SavedObjectWithMetadata;
  isShowingDeleteConfirmModal: boolean;
  isShowingExportAllOptionsModal: boolean;
  isDeleting: boolean;
  exportAllOptions: ExportAllOption[];
  exportAllSelectedOptions: Record<string, boolean>;
  isIncludeReferencesDeepChecked: boolean;
  upgradeInProgressForId?: string;
}

const unableFindSavedObjectsNotificationMessage = i18n.translate(
  'savedObjectsManagement.objectsTable.unableFindSavedObjectsNotificationMessage',
  { defaultMessage: 'Unable find saved objects' }
);
const unableFindSavedObjectNotificationMessage = i18n.translate(
  'savedObjectsManagement.objectsTable.unableFindSavedObjectNotificationMessage',
  { defaultMessage: 'Unable to find saved object' }
);

export class PluginsTable extends Component<SavedObjectsTableProps, SavedObjectsTableState> {
  private _isMounted = false;

  constructor(props: SavedObjectsTableProps) {
    super(props);

    this.state = {
      totalCount: 0,
      page: 0,
      perPage: props.perPageConfig || 50,
      plugins: [],
      savedObjectCounts: props.allowedSources.reduce((typeToCountMap, type) => {
        typeToCountMap[type.name] = 0;
        return typeToCountMap;
      }, {} as Record<string, number>),
      activeQuery: props.initialQuery ?? Query.parse(''),
      selectedSavedObjects: [],
      isShowingImportFlyout: false,
      isSearching: false,
      filteredItemCount: 0,
      isShowingRelationships: false,
      relationshipObject: undefined,
      isShowingDeleteConfirmModal: false,
      isShowingExportAllOptionsModal: false,
      isDeleting: false,
      exportAllOptions: [],
      exportAllSelectedOptions: {},
      isIncludeReferencesDeepChecked: true,
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchAllSavedObjects();
    this.fetchCounts();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFindObjects.cancel();
    // this.debouncedBulkGetObjects.cancel();
  }

  fetchCounts = async () => {
    const { taggingApi } = this.props;
    const { queryText, visibleTypes, selectedTags } = parseQuery(
      this.state.activeQuery,
      this.props.allowedSources
    );

    const allowedSources = this.props.allowedSources.map((type) => type.name);

    const selectedTypes = allowedSources.filter(
      (type) => !visibleTypes || visibleTypes.includes(type)
    );

    const references = getTagFindReferences({ selectedTags, taggingApi });

    // These are the saved objects visible in the table.
    const filteredSavedObjectCounts = await getSavedObjectCounts({
      http: this.props.http,
      typesToInclude: selectedTypes,
      searchString: queryText,
      references,
    });

    const exportAllOptions: ExportAllOption[] = Object.entries(filteredSavedObjectCounts).map(
      ([id, count]) => ({
        id,
        label: `${id} (${count || 0})`,
      })
    );
    const exportAllSelectedOptions: Record<string, boolean> = exportAllOptions.reduce(
      (record, { id }) => {
        return {
          ...record,
          [id]: true,
        };
      },
      {}
    );

    // Fetch all the saved objects that exist so we can accurately populate the counts within
    // the table filter dropdown.
    const savedObjectCounts = await getSavedObjectCounts({
      http: this.props.http,
      typesToInclude: allowedSources,
      searchString: queryText,
    });

    this.setState((state) => ({
      ...state,
      savedObjectCounts,
      exportAllOptions,
      exportAllSelectedOptions,
    }));
  };

  fetchAllSavedObjects = () => {
    this.setState({ isSearching: true }, this.debouncedFindObjects);
  };

  fetchSavedObjects = (objects: Array<{ type: string; id: string }>) => {
    // this.setState({ isSearching: true }, () => this.debouncedBulkGetObjects(objects));
  };

  findObjects = async () => {
    const { activeQuery: query, page, perPage } = this.state;
    const { notifications, http, allowedSources, taggingApi } = this.props;
    const { queryText, visibleTypes, selectedTags } = parseQuery(query, allowedSources);

    const searchTypes = allowedSources
      .map((type) => type.name)
      .filter((type) => !visibleTypes || visibleTypes.includes(type));

    // "searchFields" is missing from the "findOptions" but gets injected via the API.
    // The API extracts the fields from each uiExports.savedObjectsManagement "defaultSearchField" attribute
    const findOptions: SavedObjectsFindOptions = {
      search: queryText ? `${queryText}*` : undefined,
      perPage,
      page: page + 1,
      fields: ['id'],
      type: searchTypes,
    };
    if (findOptions.type.length > 1) {
      findOptions.sortField = 'type';
    }

    findOptions.hasReference = getTagFindReferences({ selectedTags, taggingApi });

    try {
      const resp = await http.get('/api/plugins/_list');
      console.log('response:', resp);
      if (!this._isMounted) {
        return;
      }

      this.setState({
        plugins: resp,
        isSearching: false,
      });
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isSearching: false,
        });
      }
      notifications.toasts.addDanger({
        title: unableFindSavedObjectsNotificationMessage,
        text: `${error}`,
      });
    }
  };

  debouncedFindObjects = debounce(this.findObjects, 300);

  // debouncedBulkGetObjects = debounce(async (objects: Array<{ type: string; id: string }>) => {
  //   const { notifications, http } = this.props;
  //   try {
  //     const resp = await bulkGetObjects(http, objects);
  //     if (!this._isMounted) {
  //       return;
  //     }

  //     const { map: fetchedObjectsMap, errors: objectErrors } = resp.reduce(
  //       ({ map, errors }, obj) => {
  //         if (obj.error) {
  //           errors.push(obj.error.message);
  //         } else {
  //           map.set(getObjectKey(obj), obj);
  //         }
  //         return { map, errors };
  //       },
  //       { map: new Map<string, SavedObjectWithMetadata>(), errors: [] as string[] }
  //     );

  //     if (objectErrors.length) {
  //       notifications.toasts.addDanger({
  //         title: unableFindSavedObjectNotificationMessage,
  //         text: objectErrors.join(', '),
  //       });
  //     }

  //     this.setState(({ savedObjects, filteredItemCount }) => {
  //       // modify the existing objects array, replacing any existing objects with the newly fetched ones
  //       const refreshedSavedObjects = savedObjects.map((obj) => {
  //         const fetchedObject = fetchedObjectsMap.get(getObjectKey(obj));
  //         return fetchedObject ?? obj;
  //       });
  //       return {
  //         savedObjects: refreshedSavedObjects,
  //         filteredItemCount,
  //         isSearching: false,
  //       };
  //     });
  //   } catch (error) {
  //     if (this._isMounted) {
  //       this.setState({
  //         isSearching: false,
  //       });
  //     }
  //     notifications.toasts.addDanger({
  //       title: unableFindSavedObjectsNotificationMessage,
  //       text: `${error}`,
  //     });
  //   }
  // }, 300);

  refreshAllPlugins = async () => {
    await Promise.all([this.fetchAllSavedObjects(), this.fetchCounts()]);
  };

  refreshObjects = async (objects: Array<{ type: string; id: string }>) => {
    // const currentObjectsSet = this.state.savedObjects.reduce(
    //   (acc, obj) => acc.add(getObjectKey(obj)),
    //   new Set<string>()
    // );
    // const objectsToFetch = objects.filter((obj) => currentObjectsSet.has(getObjectKey(obj)));
    // if (objectsToFetch.length) {
    //   this.fetchSavedObjects(objectsToFetch);
    // }
  };

  onSelectionChanged = (selection: SavedObjectWithMetadata[]) => {
    this.setState({ selectedSavedObjects: selection });
  };

  onQueryChange = ({ query }: { query: Query }) => {
    // TODO: Use isSameQuery to compare new query with state.activeQuery to avoid re-fetching the
    // same data we already have.
    this.setState(
      {
        activeQuery: query,
        page: 0, // Reset this on each query change
        selectedSavedObjects: [],
      },
      () => {
        this.fetchAllSavedObjects();
        this.fetchCounts();
      }
    );
  };

  onTableChange = async (table: any) => {
    const { index: page, size: perPage } = table.page || {};

    this.setState(
      {
        page,
        perPage,
        selectedSavedObjects: [],
      },
      this.fetchAllSavedObjects
    );
  };

  onShowRelationships = (object: SavedObjectWithMetadata) => {
    this.setState({
      isShowingRelationships: true,
      relationshipObject: object,
    });
  };

  onHideRelationships = () => {
    this.setState({
      isShowingRelationships: false,
      relationshipObject: undefined,
    });
  };

  onExport = async (includeReferencesDeep: boolean) => {
    const { selectedSavedObjects } = this.state;
    const { notifications, http } = this.props;
    const objectsToExport = selectedSavedObjects.map((obj) => ({ id: obj.id, type: obj.type }));

    let blob;
    try {
      blob = await fetchExportObjects(http, objectsToExport, includeReferencesDeep);
    } catch (e) {
      notifications.toasts.addDanger({
        title: i18n.translate('savedObjectsManagement.objectsTable.export.toastErrorMessage', {
          defaultMessage: 'Unable to generate export: {error}',
          values: {
            error: e.body?.message ?? e,
          },
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');

    const exportDetails = await extractExportDetails(blob);
    this.showExportCompleteMessage(exportDetails);
  };

  onExportAll = async () => {
    const { exportAllSelectedOptions, isIncludeReferencesDeepChecked, activeQuery } = this.state;
    const { notifications, http, taggingApi, allowedSources } = this.props;
    const { queryText, selectedTags } = parseQuery(activeQuery, allowedSources);
    const exportTypes = Object.entries(exportAllSelectedOptions).reduce((accum, [id, selected]) => {
      if (selected) {
        accum.push(id);
      }
      return accum;
    }, [] as string[]);

    const references = getTagFindReferences({ selectedTags, taggingApi });

    let blob;
    try {
      blob = await fetchExportByTypeAndSearch({
        http,
        search: queryText ? `${queryText}*` : undefined,
        types: exportTypes,
        references,
        includeReferencesDeep: isIncludeReferencesDeepChecked,
      });
    } catch (e) {
      notifications.toasts.addDanger({
        title: i18n.translate('savedObjectsManagement.objectsTable.export.toastErrorMessage', {
          defaultMessage: 'Unable to generate export: {error}',
          values: {
            error: e.body?.message ?? e,
          },
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');

    const exportDetails = await extractExportDetails(blob);
    this.showExportCompleteMessage(exportDetails);
    this.setState({ isShowingExportAllOptionsModal: false });
  };

  showExportCompleteMessage = (exportDetails: SavedObjectsExportResultDetails | undefined) => {
    const { notifications } = this.props;
    if (exportDetails) {
      if (exportDetails.missingReferences.length > 0) {
        return notifications.toasts.addWarning({
          title: i18n.translate(
            'savedObjectsManagement.objectsTable.export.successWithMissingRefsNotification',
            {
              defaultMessage:
                'Your file is downloading in the background. ' +
                'Some related objects could not be found. ' +
                'Please see the last line in the exported file for a list of missing objects.',
            }
          ),
        });
      }
      if (exportDetails.excludedObjects.length > 0) {
        return notifications.toasts.addSuccess({
          title: i18n.translate(
            'savedObjectsManagement.objectsTable.export.successWithExcludedObjectsNotification',
            {
              defaultMessage:
                'Your file is downloading in the background. ' +
                'Some objects were excluded from the export. ' +
                'Please see the last line in the exported file for a list of excluded objects.',
            }
          ),
        });
      }
    }
    return notifications.toasts.addSuccess({
      title: i18n.translate('savedObjectsManagement.objectsTable.export.successNotification', {
        defaultMessage: 'Your file is downloading in the background',
      }),
    });
  };

  finishImport = () => {
    this.hideImportFlyout();
    this.fetchAllSavedObjects();
    this.fetchCounts();
  };

  showImportFlyout = () => {
    this.setState({ isShowingImportFlyout: true });
  };

  hideImportFlyout = () => {
    this.setState({ isShowingImportFlyout: false });
  };

  onDelete = () => {
    this.setState({ isShowingDeleteConfirmModal: true });
  };

  delete = async () => {
    const { savedObjectsClient } = this.props;
    const { selectedSavedObjects, isDeleting } = this.state;

    if (isDeleting) {
      return;
    }

    this.setState({ isDeleting: true });

    const indexPatterns = selectedSavedObjects.filter((object) => object.type === 'index-pattern');
    if (indexPatterns.length) {
      await this.props.dataViews.clearCache();
    }

    const deletes = selectedSavedObjects
      .filter((object) => !object.meta.hiddenType)
      .map((object) => savedObjectsClient.delete(object.type, object.id, { force: true }));
    await Promise.all(deletes);

    // Unset this
    this.setState({
      selectedSavedObjects: [],
    });

    // Fetching all data
    this.fetchAllSavedObjects();
    await this.fetchCounts();

    // Allow the user to interact with the table once the saved objects have been re-fetched.
    this.setState({
      isShowingDeleteConfirmModal: false,
      isDeleting: false,
    });
  };

  renderDeleteConfirmModal() {
    const { isShowingDeleteConfirmModal, isDeleting, selectedSavedObjects } = this.state;
    const { allowedSources } = this.props;

    if (!isShowingDeleteConfirmModal) {
      return null;
    }

    return (
      <DeleteConfirmModal
        isDeleting={isDeleting}
        onConfirm={() => {
          this.delete();
        }}
        onCancel={() => {
          this.setState({ isShowingDeleteConfirmModal: false });
        }}
        selectedObjects={selectedSavedObjects}
        allowedSources={allowedSources}
      />
    );
  }


  render() {
    const {
      selectedSavedObjects,
      page,
      perPage,
      plugins,
      filteredItemCount,
      isSearching,
      savedObjectCounts,
      upgradeInProgressForId,
    } = this.state;
    const { http, taggingApi, allowedSources, applications, notifications } = this.props;

    const selectionConfig = {
      onSelectionChange: this.onSelectionChanged,
    };

    const filterOptions = allowedSources.map((type) => ({
      value: type.displayName,
      name: type.displayName,
      view: `${type.displayName} (${savedObjectCounts[type.name] || 0})`,
    }));

    return (
      <div>
        {this.renderDeleteConfirmModal()}
        <Header onRefresh={this.refreshAllPlugins} />
        <EuiSpacer size="l" />
        <RedirectAppLinks application={applications}>
          <Table
            onUpgrade={(id) => {
              this.setState({ upgradeInProgressForId: id });
              http.post('/api/plugins/_upgrade').finally(() => {
                this.findObjects()
                  .then(() =>
                    notifications.toasts.addSuccess({
                      title: 'Succesfully upgraded plugin',
                    })
                  )
                  .catch(() =>
                    notifications.toasts.addDanger({
                      title: 'Could not upgrade plugin',
                    })
                  )
                  .finally(() => {
                    this.setState({ upgradeInProgressForId: undefined });
                  });
              });
            }}
            upgradeInProgressForId={upgradeInProgressForId}
            basePath={http.basePath}
            taggingApi={taggingApi}
            initialQuery={this.props.initialQuery}
            allowedSources={allowedSources}
            itemId={'id'}
            actionRegistry={this.props.actionRegistry}
            columnRegistry={this.props.columnRegistry}
            selectionConfig={selectionConfig}
            selectedSavedObjects={selectedSavedObjects}
            onQueryChange={this.onQueryChange}
            onTableChange={this.onTableChange}
            filterOptions={filterOptions}
            onExport={this.onExport}
            capabilities={applications.capabilities}
            onDelete={this.onDelete}
            onActionRefresh={this.refreshObjects}
            goInspectObject={this.props.goInspectObject}
            pageIndex={page}
            pageSize={perPage}
            items={plugins}
            totalItemCount={filteredItemCount}
            isSearching={isSearching}
            onShowRelationships={this.onShowRelationships}
            canGoInApp={this.props.canGoInApp}
          />
        </RedirectAppLinks>
      </div>
    );
  }
}

function getObjectKey(obj: { type: string; id: string }) {
  return `${obj.type}:${obj.id}`;
}
