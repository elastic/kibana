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
// @ts-ignore
import { saveAs } from '@elastic/filesaver';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EUI_MODAL_CONFIRM_BUTTON,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckboxGroup,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiInMemoryTable,
  EuiLoadingKibana,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
  EuiPageContent,
  Query,
} from '@elastic/eui';
import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  HttpStart,
  OverlayStart,
  NotificationsStart,
  Capabilities,
} from 'src/core/public';
import { IndexPatternsContract } from '../../../data/public';
import { SavedObjectWithMetadata } from '../types';
import {
  parseQuery,
  getSavedObjectCounts,
  getRelationships,
  getSavedObjectLabel,
  fetchExportObjects,
  fetchExportByTypeAndSearch,
  findObjects,
  extractExportDetails,
  SavedObjectsExportResultDetails,
} from './lib';
import { Table, Header, Relationships } from './components';

interface SavedObjectsTableProps {
  allowedTypes: string[];
  savedObjectsClient: SavedObjectsClientContract;
  indexPatterns: IndexPatternsContract;
  http: HttpStart;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  capabilities: Capabilities;
  perPageConfig: number;
  // newIndexPatternUrl - kbnUrl.eval('#/management/kibana/index_pattern')
  // service - savedObjectManagementRegistry.all().map(obj => obj.service);
  goInspectObject: (obj: SavedObjectWithMetadata) => void;
  canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
}

interface SavedObjectsTableState {
  totalCount: number;
  page: number;
  perPage: number;
  savedObjects: SavedObjectWithMetadata[];
  savedObjectCounts: Record<string, number>;
  activeQuery: QueryType;
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

interface ExportAllOption {
  id: string;
  label: string;
}

interface QueryType {
  text: string;
  ast: any;
  syntax: any;
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
    this.debouncedFetch.cancel();
  }

  fetchCounts = async () => {
    const { allowedTypes } = this.props;
    const { queryText, visibleTypes } = parseQuery(this.state.activeQuery);

    const filteredTypes = allowedTypes.filter(type => !visibleTypes || visibleTypes.includes(type));

    // These are the saved objects visible in the table.
    const filteredSavedObjectCounts = await getSavedObjectCounts(
      this.props.http,
      filteredTypes,
      queryText
    );

    const exportAllOptions: ExportAllOption[] = [];
    const exportAllSelectedOptions: Record<string, boolean> = {};

    Object.keys(filteredSavedObjectCounts).forEach(id => {
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

    this.setState(state => ({
      ...state,
      savedObjectCounts,
      exportAllOptions,
      exportAllSelectedOptions,
    }));
  };

  fetchSavedObjects = () => {
    this.setState(
      {
        isSearching: true,
      },
      this.debouncedFetch
    );
  };

  debouncedFetch = debounce(async () => {
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
      type: allowedTypes.filter(type => !visibleTypes || visibleTypes.includes(type)),
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
          'kbn.management.objects.objectsTable.unableFindSavedObjectsNotificationMessage',
          { defaultMessage: 'Unable find saved objects' }
        ),
        text: `${error}`,
      });
    }
  }, 300);

  refreshData = async () => {
    await Promise.all([this.fetchSavedObjects(), this.fetchCounts()]);
  };

  onSelectionChanged = (selection: SavedObjectWithMetadata[]) => {
    this.setState({ selectedSavedObjects: selection });
  };

  onQueryChange = ({ query }: { query: QueryType }) => {
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
    // TODO type
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
    const objectsToExport = selectedSavedObjects.map(obj => ({ id: obj.id, type: obj.type }));

    let blob;
    try {
      blob = await fetchExportObjects(http, objectsToExport, includeReferencesDeep);
    } catch (e) {
      notifications.toasts.addDanger({
        title: i18n.translate('kbn.management.objects.objectsTable.export.dangerNotification', {
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
        title: i18n.translate('kbn.management.objects.objectsTable.export.dangerNotification', {
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
          'kbn.management.objects.objectsTable.export.successWithMissingRefsNotification',
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
        title: i18n.translate('kbn.management.objects.objectsTable.export.successNotification', {
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

    const indexPatterns = selectedSavedObjects.filter(object => object.type === 'index-pattern');
    if (indexPatterns.length) {
      await this.props.indexPatterns.clearCache();
    }

    const objects = await savedObjectsClient.bulkGet(selectedSavedObjects);
    const deletes = objects.savedObjects.map(object =>
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
    return await getRelationships(type, id, allowedTypes, http);
  };

  renderFlyout() {
    if (!this.state.isShowingImportFlyout) {
      return null;
    }

    /* TODO wire
    return (
      <Flyout
        close={this.hideImportFlyout}
        done={this.finishImport}
        services={this.props.services}
        indexPatterns={this.props.indexPatterns}
        newIndexPatternUrl={this.props.newIndexPatternUrl}
        savedObjectTypes={this.props.savedObjectTypes}
        confirmModalPromise={this.props.confirmModalPromise}
      />
    );
    */
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
      modal = <EuiLoadingKibana size="xl" />;
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
              id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModalTitle"
              defaultMessage="Delete saved objects"
            />
          }
          onCancel={onCancel}
          onConfirm={onConfirm}
          buttonColor="danger"
          cancelButtonText={
            <FormattedMessage
              id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isDeleting ? (
              <FormattedMessage
                id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.deleteProcessButtonLabel"
                defaultMessage="Deleting…"
              />
            ) : (
              <FormattedMessage
                id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.deleteButtonLabel"
                defaultMessage="Delete"
              />
            )
          }
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            <FormattedMessage
              id="kbn.management.objects.deleteSavedObjectsConfirmModalDescription"
              defaultMessage="This action will delete the following saved objects:"
            />
          </p>
          <EuiInMemoryTable
            items={selectedSavedObjects}
            columns={[
              {
                field: 'type',
                name: i18n.translate(
                  'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.typeColumnName',
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
                  'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.idColumnName',
                  { defaultMessage: 'Id' }
                ),
              },
              {
                field: 'meta.title',
                name: i18n.translate(
                  'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.titleColumnName',
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
    this.setState(state => ({
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
                id="kbn.management.objects.objectsTable.exportObjectsConfirmModalTitle"
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
                  id="kbn.management.objects.objectsTable.exportObjectsConfirmModalDescription"
                  defaultMessage="Select which types to export"
                />
              }
              labelType="legend"
            >
              <EuiCheckboxGroup
                options={exportAllOptions}
                idToSelectedMap={exportAllSelectedOptions}
                onChange={optionId => {
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
                  id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.includeReferencesDeepLabel"
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
                        id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.cancelButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton fill onClick={this.onExportAll}>
                      <FormattedMessage
                        id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.exportAllButtonLabel"
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
    const { http, allowedTypes } = this.props;

    const selectionConfig = {
      onSelectionChange: this.onSelectionChanged,
    };

    const filterOptions = allowedTypes.map(type => ({
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
          onRefresh={this.refreshData}
          filteredCount={filteredItemCount}
        />
        <EuiSpacer size="xs" />
        <Table
          basePath={http.basePath}
          itemId={'id'}
          selectionConfig={selectionConfig}
          selectedSavedObjects={selectedSavedObjects}
          onQueryChange={this.onQueryChange}
          onTableChange={this.onTableChange}
          filterOptions={filterOptions}
          onExport={this.onExport}
          canDelete={this.props.capabilities.savedObjectsManagement.delete as boolean}
          onDelete={this.onDelete}
          goInspectObject={this.props.goInspectObject}
          pageIndex={page}
          pageSize={perPage}
          items={savedObjects}
          totalItemCount={filteredItemCount}
          isSearching={isSearching}
          onShowRelationships={this.onShowRelationships}
          canGoInApp={this.props.canGoInApp}
        />
      </EuiPageContent>
    );
  }
}
