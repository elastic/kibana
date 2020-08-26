/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import { debounce } from 'lodash';
// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import {
  EuiSpacer,
  Query,
  EuiInMemoryTable,
  EuiIcon,
  EuiConfirmModal,
  EuiLoadingElastic,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiCheckboxGroup,
  EuiToolTip,
  EuiPageContent,
  EuiSwitch,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiModalHeaderTitle,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  HttpStart,
  OverlayStart,
  NotificationsStart,
  ApplicationStart,
} from 'src/core/public';
import { RedirectAppLinks } from '../../../../kibana_react/public';
import { IndexPatternsContract } from '../../../../data/public';
import {
  parseQuery,
  getSavedObjectCounts,
  getRelationships,
  getSavedObjectLabel,
  fetchExportObjects,
  fetchExportByTypeAndSearch,
  findObjects,
  findObject,
  extractExportDetails,
  SavedObjectsExportResultDetails,
} from '../../lib';
import { SavedObjectWithMetadata } from '../../types';
import {
  ISavedObjectsManagementServiceRegistry,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceStart,
} from '../../services';
import { Header, Table, Flyout, Relationships } from './components';
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
  http: HttpStart;
  search: DataPublicPluginStart['search'];
  overlays: OverlayStart;
  notifications: NotificationsStart;
  applications: ApplicationStart;
  perPageConfig: number;
  goInspectObject: (obj: SavedObjectWithMetadata) => void;
  canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
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
      activeQuery: Query.parse(''),
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
    const { allowedTypes } = this.props;
    const { queryText, visibleTypes } = parseQuery(this.state.activeQuery);

    const filteredTypes = allowedTypes.filter(
      (type) => !visibleTypes || visibleTypes.includes(type)
    );

    // These are the saved objects visible in the table.
    const filteredSavedObjectCounts = await getSavedObjectCounts(
      this.props.http,
      filteredTypes,
      queryText
    );

    const exportAllOptions: ExportAllOption[] = [];
    const exportAllSelectedOptions: Record<string, boolean> = {};

    Object.keys(filteredSavedObjectCounts).forEach((id) => {
      // Add this type as a bulk-export option.
      exportAllOptions.push({
        id,
        label: `${id} (${filteredSavedObjectCounts[id] || 0})`,
      });

      // Select it by default.
      exportAllSelectedOptions[id] = true;
    });

    // Fetch all the saved objects that exist so we can accurately populate the counts within
    // the table filter dropdown.
    const savedObjectCounts = await getSavedObjectCounts(this.props.http, allowedTypes, queryText);

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
    const { notifications, http, allowedTypes } = this.props;
    const { queryText, visibleTypes } = parseQuery(query);
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
    const { notifications, http } = this.props;
    const { queryText } = parseQuery(activeQuery);
    const exportTypes = Object.entries(exportAllSelectedOptions).reduce((accum, [id, selected]) => {
      if (selected) {
        accum.push(id);
      }
      return accum;
    }, [] as string[]);

    let blob;
    try {
      blob = await fetchExportByTypeAndSearch(
        http,
        exportTypes,
        queryText ? `${queryText}*` : undefined,
        isIncludeReferencesDeepChecked
      );
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
      savedObjectsClient.delete(object.type, object.id)
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

    let modal;

    if (isDeleting) {
      // Block the user from interacting with the table while its contents are being deleted.
      modal = <EuiLoadingElastic size="xl" />;
    } else {
      const onCancel = () => {
        this.setState({ isShowingDeleteConfirmModal: false });
      };

      const onConfirm = () => {
        this.delete();
      };

      modal = (
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModalTitle"
              defaultMessage="Delete saved objects"
            />
          }
          onCancel={onCancel}
          onConfirm={onConfirm}
          buttonColor="danger"
          cancelButtonText={
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isDeleting ? (
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.deleteProcessButtonLabel"
                defaultMessage="Deleting…"
              />
            ) : (
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.deleteButtonLabel"
                defaultMessage="Delete"
              />
            )
          }
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            <FormattedMessage
              id="savedObjectsManagement.deleteSavedObjectsConfirmModalDescription"
              defaultMessage="This action will delete the following saved objects:"
            />
          </p>
          <EuiInMemoryTable
            items={selectedSavedObjects}
            columns={[
              {
                field: 'type',
                name: i18n.translate(
                  'savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.typeColumnName',
                  { defaultMessage: 'Type' }
                ),
                width: '50px',
                render: (type, object) => (
                  <EuiToolTip position="top" content={getSavedObjectLabel(type)}>
                    <EuiIcon type={object.meta.icon || 'apps'} />
                  </EuiToolTip>
                ),
              },
              {
                field: 'id',
                name: i18n.translate(
                  'savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.idColumnName',
                  { defaultMessage: 'Id' }
                ),
              },
              {
                field: 'meta.title',
                name: i18n.translate(
                  'savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.titleColumnName',
                  { defaultMessage: 'Title' }
                ),
              },
            ]}
            pagination={true}
            sorting={false}
          />
        </EuiConfirmModal>
      );
    }

    return <EuiOverlayMask>{modal}</EuiOverlayMask>;
  }

  changeIncludeReferencesDeep = () => {
    this.setState((state) => ({
      isIncludeReferencesDeepChecked: !state.isIncludeReferencesDeepChecked,
    }));
  };

  closeExportAllModal = () => {
    this.setState({ isShowingExportAllOptionsModal: false });
  };

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
      <EuiOverlayMask>
        <EuiModal onClose={this.closeExportAllModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.exportObjectsConfirmModalTitle"
                defaultMessage="Export {filteredItemCount, plural, one{# object} other {# objects}}"
                values={{
                  filteredItemCount,
                }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="savedObjectsManagement.objectsTable.exportObjectsConfirmModalDescription"
                  defaultMessage="Select which types to export"
                />
              }
              labelType="legend"
            >
              <EuiCheckboxGroup
                options={exportAllOptions}
                idToSelectedMap={exportAllSelectedOptions}
                onChange={(optionId) => {
                  const newExportAllSelectedOptions = {
                    ...exportAllSelectedOptions,
                    ...{
                      [optionId]: !exportAllSelectedOptions[optionId],
                    },
                  };

                  this.setState({
                    exportAllSelectedOptions: newExportAllSelectedOptions,
                  });
                }}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiSwitch
              name="includeReferencesDeep"
              label={
                <FormattedMessage
                  id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.includeReferencesDeepLabel"
                  defaultMessage="Include related objects"
                />
              }
              checked={isIncludeReferencesDeepChecked}
              onChange={this.changeIncludeReferencesDeep}
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={this.closeExportAllModal}>
                      <FormattedMessage
                        id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.cancelButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton fill onClick={this.onExportAll}>
                      <FormattedMessage
                        id="savedObjectsManagement.objectsTable.exportObjectsConfirmModal.exportAllButtonLabel"
                        defaultMessage="Export all"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
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
    const { http, allowedTypes, applications } = this.props;

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
            itemId={'id'}
            actionRegistry={this.props.actionRegistry}
            columnRegistry={this.props.columnRegistry}
            selectionConfig={selectionConfig}
            selectedSavedObjects={selectedSavedObjects}
            onQueryChange={this.onQueryChange}
            onTableChange={this.onTableChange}
            filterOptions={filterOptions}
            onExport={this.onExport}
            canDelete={applications.capabilities.savedObjectsManagement.delete as boolean}
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
