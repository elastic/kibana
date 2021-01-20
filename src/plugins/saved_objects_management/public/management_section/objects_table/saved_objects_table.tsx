/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';
import { debounce } from 'lodash';
// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import { EuiSpacer, Query, EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  HttpStart,
  OverlayStart,
  NotificationsStart,
  ApplicationStart,
} from 'src/core/public';
import { RedirectAppLinks } from '../../../../kibana_react/public';
import { SavedObjectsTaggingApi } from '../../../../saved_objects_tagging_oss/public';
import { IndexPatternsContract } from '../../../../data/public';
import {
  parseQuery,
  getSavedObjectCounts,
  getRelationships,
  fetchExportObjects,
  fetchExportByTypeAndSearch,
  findObjects,
  findObject,
  extractExportDetails,
  SavedObjectsExportResultDetails,
  getTagFindReferences,
} from '../../lib';
import { SavedObjectWithMetadata } from '../../types';
import {
  ISavedObjectsManagementServiceRegistry,
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
import { DataPublicPluginStart } from '../../../../../plugins/data/public';

interface ExportAllOption {
  id: string;
  label: string;
}

export interface SavedObjectsTableProps {
  allowedTypes: string[];
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  actionRegistry: SavedObjectsManagementActionServiceStart;
  columnRegistry: SavedObjectsManagementColumnServiceStart;
  savedObjectsClient: SavedObjectsClientContract;
  indexPatterns: IndexPatternsContract;
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
  savedObjects: SavedObjectWithMetadata[];
  savedObjectCounts: Record<string, number>;
  activeQuery: Query;
  selectedSavedObjects: SavedObjectWithMetadata[];
  isShowingImportFlyout: boolean;
  isSearching: boolean;
  filteredItemCount: number;
  isShowingRelationships: boolean;
  relationshipObject?: SavedObjectWithMetadata;
  isShowingDeleteConfirmModal: boolean;
  isShowingExportAllOptionsModal: boolean;
  isDeleting: boolean;
  exportAllOptions: ExportAllOption[];
  exportAllSelectedOptions: Record<string, boolean>;
  isIncludeReferencesDeepChecked: boolean;
}

export class SavedObjectsTable extends Component<SavedObjectsTableProps, SavedObjectsTableState> {
  private _isMounted = false;

  constructor(props: SavedObjectsTableProps) {
    super(props);

    this.state = {
      totalCount: 0,
      page: 0,
      perPage: props.perPageConfig || 50,
      savedObjects: [],
      savedObjectCounts: props.allowedTypes.reduce((typeToCountMap, type) => {
        typeToCountMap[type] = 0;
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
    this.fetchSavedObjects();
    this.fetchCounts();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetchObjects.cancel();
  }

  fetchCounts = async () => {
    const { allowedTypes, taggingApi } = this.props;
    const { queryText, visibleTypes, selectedTags } = parseQuery(this.state.activeQuery);

    const selectedTypes = allowedTypes.filter(
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
      typesToInclude: allowedTypes,
      searchString: queryText,
    });

    this.setState((state) => ({
      ...state,
      savedObjectCounts,
      exportAllOptions,
      exportAllSelectedOptions,
    }));
  };

  fetchSavedObjects = () => {
    this.setState({ isSearching: true }, this.debouncedFetchObjects);
  };

  fetchSavedObject = (type: string, id: string) => {
    this.setState({ isSearching: true }, () => this.debouncedFetchObject(type, id));
  };

  debouncedFetchObjects = debounce(async () => {
    const { activeQuery: query, page, perPage } = this.state;
    const { notifications, http, allowedTypes, taggingApi } = this.props;
    const { queryText, visibleTypes, selectedTags } = parseQuery(query);
    // "searchFields" is missing from the "findOptions" but gets injected via the API.
    // The API extracts the fields from each uiExports.savedObjectsManagement "defaultSearchField" attribute
    const findOptions: SavedObjectsFindOptions = {
      search: queryText ? `${queryText}*` : undefined,
      perPage,
      page: page + 1,
      fields: ['id'],
      type: allowedTypes.filter((type) => !visibleTypes || visibleTypes.includes(type)),
    };
    if (findOptions.type.length > 1) {
      findOptions.sortField = 'type';
    }

    findOptions.hasReference = getTagFindReferences({ selectedTags, taggingApi });

    try {
      const resp = await findObjects(http, findOptions);
      if (!this._isMounted) {
        return;
      }

      this.setState(({ activeQuery }) => {
        // ignore results for old requests
        if (activeQuery.text !== query.text) {
          return null;
        }

        return {
          savedObjects: resp.savedObjects,
          filteredItemCount: resp.total,
          isSearching: false,
        };
      });
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isSearching: false,
        });
      }
      notifications.toasts.addDanger({
        title: i18n.translate(
          'savedObjectsManagement.objectsTable.unableFindSavedObjectsNotificationMessage',
          { defaultMessage: 'Unable find saved objects' }
        ),
        text: `${error}`,
      });
    }
  }, 300);

  debouncedFetchObject = debounce(async (type: string, id: string) => {
    const { notifications, http } = this.props;
    try {
      const resp = await findObject(http, type, id);
      if (!this._isMounted) {
        return;
      }

      this.setState(({ savedObjects, filteredItemCount }) => {
        const refreshedSavedObjects = savedObjects.map((object) =>
          object.type === type && object.id === id ? resp : object
        );
        return {
          savedObjects: refreshedSavedObjects,
          filteredItemCount,
          isSearching: false,
        };
      });
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isSearching: false,
        });
      }
      notifications.toasts.addDanger({
        title: i18n.translate(
          'savedObjectsManagement.objectsTable.unableFindSavedObjectNotificationMessage',
          { defaultMessage: 'Unable to find saved object' }
        ),
        text: `${error}`,
      });
    }
  }, 300);

  refreshObjects = async () => {
    await Promise.all([this.fetchSavedObjects(), this.fetchCounts()]);
  };

  refreshObject = async ({ type, id }: SavedObjectWithMetadata) => {
    await this.fetchSavedObject(type, id);
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
        this.fetchSavedObjects();
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
      this.fetchSavedObjects
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
        title: i18n.translate('savedObjectsManagement.objectsTable.export.dangerNotification', {
          defaultMessage: 'Unable to generate export',
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');

    const exportDetails = await extractExportDetails(blob);
    this.showExportSuccessMessage(exportDetails);
  };

  onExportAll = async () => {
    const { exportAllSelectedOptions, isIncludeReferencesDeepChecked, activeQuery } = this.state;
    const { notifications, http, taggingApi } = this.props;
    const { queryText, selectedTags } = parseQuery(activeQuery);
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
        title: i18n.translate('savedObjectsManagement.objectsTable.export.dangerNotification', {
          defaultMessage: 'Unable to generate export',
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');

    const exportDetails = await extractExportDetails(blob);
    this.showExportSuccessMessage(exportDetails);
    this.setState({ isShowingExportAllOptionsModal: false });
  };

  showExportSuccessMessage = (exportDetails: SavedObjectsExportResultDetails | undefined) => {
    const { notifications } = this.props;
    if (exportDetails && exportDetails.missingReferences.length > 0) {
      notifications.toasts.addWarning({
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
    } else {
      notifications.toasts.addSuccess({
        title: i18n.translate('savedObjectsManagement.objectsTable.export.successNotification', {
          defaultMessage: 'Your file is downloading in the background',
        }),
      });
    }
  };

  finishImport = () => {
    this.hideImportFlyout();
    this.fetchSavedObjects();
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
      await this.props.indexPatterns.clearCache();
    }

    const objects = await savedObjectsClient.bulkGet(selectedSavedObjects);
    const deletes = objects.savedObjects.map((object) =>
      savedObjectsClient.delete(object.type, object.id, { force: true })
    );
    await Promise.all(deletes);

    // Unset this
    this.setState({
      selectedSavedObjects: [],
    });

    // Fetching all data
    await this.fetchSavedObjects();
    await this.fetchCounts();

    // Allow the user to interact with the table once the saved objects have been re-fetched.
    this.setState({
      isShowingDeleteConfirmModal: false,
      isDeleting: false,
    });
  };

  getRelationships = async (type: string, id: string) => {
    const { allowedTypes, http } = this.props;
    return await getRelationships(http, type, id, allowedTypes);
  };

  renderFlyout() {
    if (!this.state.isShowingImportFlyout) {
      return null;
    }
    const { applications } = this.props;
    const newIndexPatternUrl = applications.getUrlForApp('management', {
      path: 'kibana/indexPatterns',
    });

    return (
      <Flyout
        close={this.hideImportFlyout}
        done={this.finishImport}
        http={this.props.http}
        serviceRegistry={this.props.serviceRegistry}
        indexPatterns={this.props.indexPatterns}
        newIndexPatternUrl={newIndexPatternUrl}
        allowedTypes={this.props.allowedTypes}
        overlays={this.props.overlays}
        search={this.props.search}
      />
    );
  }

  renderRelationships() {
    if (!this.state.isShowingRelationships) {
      return null;
    }

    return (
      <Relationships
        basePath={this.props.http.basePath}
        savedObject={this.state.relationshipObject!}
        getRelationships={this.getRelationships}
        close={this.onHideRelationships}
        goInspectObject={this.props.goInspectObject}
        canGoInApp={this.props.canGoInApp}
      />
    );
  }

  renderDeleteConfirmModal() {
    const { isShowingDeleteConfirmModal, isDeleting, selectedSavedObjects } = this.state;
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
      />
    );
  }

  renderExportAllOptionsModal() {
    const {
      isShowingExportAllOptionsModal,
      filteredItemCount,
      exportAllOptions,
      exportAllSelectedOptions,
      isIncludeReferencesDeepChecked,
    } = this.state;

    if (!isShowingExportAllOptionsModal) {
      return null;
    }

    return (
      <ExportModal
        onExport={this.onExportAll}
        onCancel={() => {
          this.setState({ isShowingExportAllOptionsModal: false });
        }}
        onSelectedOptionsChange={(newOptions) => {
          this.setState({
            exportAllSelectedOptions: newOptions,
          });
        }}
        filteredItemCount={filteredItemCount}
        options={exportAllOptions}
        selectedOptions={exportAllSelectedOptions}
        includeReferences={isIncludeReferencesDeepChecked}
        onIncludeReferenceChange={(newIncludeReferences) => {
          this.setState({
            isIncludeReferencesDeepChecked: newIncludeReferences,
          });
        }}
      />
    );
  }

  render() {
    const {
      selectedSavedObjects,
      page,
      perPage,
      savedObjects,
      filteredItemCount,
      isSearching,
      savedObjectCounts,
    } = this.state;
    const { http, taggingApi, allowedTypes, applications } = this.props;

    const selectionConfig = {
      onSelectionChange: this.onSelectionChanged,
    };

    const filterOptions = allowedTypes.map((type) => ({
      value: type,
      name: type,
      view: `${type} (${savedObjectCounts[type] || 0})`,
    }));

    return (
      <EuiPageContent horizontalPosition="center">
        {this.renderFlyout()}
        {this.renderRelationships()}
        {this.renderDeleteConfirmModal()}
        {this.renderExportAllOptionsModal()}
        <Header
          onExportAll={() => this.setState({ isShowingExportAllOptionsModal: true })}
          onImport={this.showImportFlyout}
          onRefresh={this.refreshObjects}
          filteredCount={filteredItemCount}
        />
        <EuiSpacer size="xs" />
        <RedirectAppLinks application={applications}>
          <Table
            basePath={http.basePath}
            taggingApi={taggingApi}
            initialQuery={this.props.initialQuery}
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
            onActionRefresh={this.refreshObject}
            goInspectObject={this.props.goInspectObject}
            pageIndex={page}
            pageSize={perPage}
            items={savedObjects}
            totalItemCount={filteredItemCount}
            isSearching={isSearching}
            onShowRelationships={this.onShowRelationships}
            canGoInApp={this.props.canGoInApp}
          />
        </RedirectAppLinks>
      </EuiPageContent>
    );
  }
}
