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

import chrome from 'ui/chrome';
import { saveAs } from '@elastic/filesaver';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import { Header } from './components/header';
import { Flyout } from './components/flyout';
import { Relationships } from './components/relationships';
import { Table } from './components/table';
import { toastNotifications } from 'ui/notify';

import {
  EuiSpacer,
  Query,
  EuiInMemoryTable,
  EuiIcon,
  EuiConfirmModal,
  EuiLoadingKibana,
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
  EuiFlexItem
} from '@elastic/eui';
import {
  parseQuery,
  getSavedObjectCounts,
  getRelationships,
  getSavedObjectLabel,
  fetchExportObjects,
  fetchExportByType,
  findObjects,
} from '../../lib';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export const POSSIBLE_TYPES = chrome.getInjected('importAndExportableTypes');

class ObjectsTableUI extends Component {
  static propTypes = {
    savedObjectsClient: PropTypes.object.isRequired,
    indexPatterns: PropTypes.object.isRequired,
    $http: PropTypes.func.isRequired,
    basePath: PropTypes.string.isRequired,
    perPageConfig: PropTypes.number,
    newIndexPatternUrl: PropTypes.string.isRequired,
    services: PropTypes.array.isRequired,
    uiCapabilities: PropTypes.object.isRequired,
    goInspectObject: PropTypes.func.isRequired,
    canGoInApp: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.savedObjectTypes = POSSIBLE_TYPES.filter(type => {
      return this.props.uiCapabilities.savedObjectsManagement[type].read;
    });

    this.state = {
      totalCount: 0,
      page: 0,
      perPage: props.perPageConfig || 50,
      savedObjects: [],
      savedObjectCounts: this.savedObjectTypes.reduce((typeToCountMap, type) => {
        typeToCountMap[type] = 0;
        return typeToCountMap;
      }, {}),
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
    const { queryText, visibleTypes } = parseQuery(this.state.activeQuery);

    const filteredTypes = this.savedObjectTypes.filter(
      type => !visibleTypes || visibleTypes.includes(type)
    );

    // These are the saved objects visible in the table.
    const filteredSavedObjectCounts = await getSavedObjectCounts(
      this.props.$http,
      filteredTypes,
      queryText
    );

    const exportAllOptions = [];
    const exportAllSelectedOptions = {};

    Object.keys(filteredSavedObjectCounts).forEach(id => {
      // Add this type as a bulk-export option.
      exportAllOptions.push({
        id,
        label: `${id} (${filteredSavedObjectCounts[id] || 0})`,
      });

      // Select it by defayult.
      exportAllSelectedOptions[id] = true;
    });

    // Fetch all the saved objects that exist so we can accurately populate the counts within
    // the table filter dropdown.
    const savedObjectCounts = await getSavedObjectCounts(
      this.props.$http,
      this.savedObjectTypes,
      queryText
    );

    this.setState(state => ({
      ...state,
      savedObjectCounts,
      exportAllOptions,
      exportAllSelectedOptions,
    }));
  };

  fetchSavedObjects = () => {
    this.setState({
      isSearching: true,
    }, this.debouncedFetch);
  }

  debouncedFetch = debounce(async () => {
    const { intl } = this.props;
    const { activeQuery: query, page, perPage } = this.state;
    const { queryText, visibleTypes } = parseQuery(query);
    // "searchFields" is missing from the "findOptions" but gets injected via the API.
    // The API extracts the fields from each uiExports.savedObjectsManagement "defaultSearchField" attribute
    const findOptions = {
      search: queryText ? `${queryText}*` : undefined,
      perPage,
      page: page + 1,
      fields: ['id'],
      type: this.savedObjectTypes.filter(
        type => !visibleTypes || visibleTypes.includes(type)
      ),
    };
    if (findOptions.type.length > 1) {
      findOptions.sortField = 'type';
    }

    let resp;
    try {
      resp = await findObjects(findOptions);
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          isSearching: false,
        });
      }
      toastNotifications.addDanger({
        title: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.unableFindSavedObjectsNotificationMessage',
          defaultMessage: 'Unable find saved objects'
        }),
        text: `${error}`,
      });
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState(({ activeQuery }) => {
      // ignore results for old requests
      if (activeQuery.text !== query.text) {
        return {};
      }

      return {
        savedObjects: resp.savedObjects,
        filteredItemCount: resp.total,
        isSearching: false,
      };
    });
  }, 300);

  refreshData = async () => {
    await Promise.all([this.fetchSavedObjects(), this.fetchCounts()]);
  };

  onSelectionChanged = selection => {
    this.setState({ selectedSavedObjects: selection });
  };

  onQueryChange = ({ query }) => {
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

  onTableChange = async table => {
    const { index: page, size: perPage } = table.page || {};

    this.setState({
      page,
      perPage,
      selectedSavedObjects: [],
    }, this.fetchSavedObjects);
  };

  onShowRelationships = (object) => {
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

  onExport = async (includeReferencesDeep) => {
    const { intl } = this.props;
    const { selectedSavedObjects } = this.state;
    const objectsToExport = selectedSavedObjects.map(obj => ({ id: obj.id, type: obj.type }));

    let blob;
    try {
      blob = await fetchExportObjects(objectsToExport, includeReferencesDeep);
    } catch (e) {
      toastNotifications.addDanger({
        title: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.export.dangerNotification',
          defaultMessage: 'Unable to generate export',
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');
    toastNotifications.addSuccess({
      title: intl.formatMessage({
        id: 'kbn.management.objects.objectsTable.export.successNotification',
        defaultMessage: 'Your file is downloading in the background',
      }),
    });
  };

  onExportAll = async () => {
    const { intl } = this.props;
    const { exportAllSelectedOptions, isIncludeReferencesDeepChecked } = this.state;
    const exportTypes = Object.entries(exportAllSelectedOptions).reduce(
      (accum, [id, selected]) => {
        if (selected) {
          accum.push(id);
        }
        return accum;
      },
      []
    );

    let blob;
    try {
      blob = await fetchExportByType(exportTypes, isIncludeReferencesDeepChecked);
    } catch (e) {
      toastNotifications.addDanger({
        title: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.exportAll.dangerNotification',
          defaultMessage: 'Unable to generate export',
        }),
      });
      throw e;
    }

    saveAs(blob, 'export.ndjson');
    toastNotifications.addSuccess({
      title: intl.formatMessage({
        id: 'kbn.management.objects.objectsTable.exportAll.successNotification',
        defaultMessage: 'Your file is downloading in the background',
      }),
    });
    this.setState({ isShowingExportAllOptionsModal: false });
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

    const indexPatterns = selectedSavedObjects.filter(
      object => object.type === 'index-pattern'
    );
    if (indexPatterns.length) {
      await this.props.indexPatterns.cache.clearAll();
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

  getRelationships = async (type, id) => {
    return await getRelationships(
      type,
      id,
      this.savedObjectTypes,
      this.props.$http,
      this.props.basePath
    );
  };

  renderFlyout() {
    if (!this.state.isShowingImportFlyout) {
      return null;
    }

    return (
      <Flyout
        close={this.hideImportFlyout}
        done={this.finishImport}
        services={this.props.services}
        indexPatterns={this.props.indexPatterns}
        newIndexPatternUrl={this.props.newIndexPatternUrl}
        savedObjectTypes={this.props.savedObjectTypes}
      />
    );
  }

  renderRelationships() {
    if (!this.state.isShowingRelationships) {
      return null;
    }

    return (
      <Relationships
        savedObject={this.state.relationshipObject}
        getRelationships={this.getRelationships}
        close={this.onHideRelationships}
        getDashboardUrl={this.props.getDashboardUrl}
        goInspectObject={this.props.goInspectObject}
        canGoInApp={this.props.canGoInApp}
      />
    );
  }

  renderDeleteConfirmModal() {
    const {
      isShowingDeleteConfirmModal,
      isDeleting,
      selectedSavedObjects,
    } = this.state;
    const { intl } = this.props;

    if (!isShowingDeleteConfirmModal) {
      return null;
    }

    let modal;

    if (isDeleting) {
      // Block the user from interacting with the table while its contents are being deleted.
      modal = (
        <EuiLoadingKibana size="xl"/>
      );
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
          cancelButtonText={(
            <FormattedMessage
              id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          )}
          confirmButtonText={
            isDeleting
              ? (<FormattedMessage
                id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.deleteProcessButtonLabel"
                defaultMessage="Deleting…"
              />)
              :  (<FormattedMessage
                id="kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.deleteButtonLabel"
                defaultMessage="Delete"
              />)
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
                name: intl.formatMessage({
                  id: 'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.typeColumnName', defaultMessage: 'Type'
                }),
                width: '50px',
                render: (type, object) => (
                  <EuiToolTip
                    position="top"
                    content={getSavedObjectLabel(type)}
                  >
                    <EuiIcon type={object.meta.icon || 'apps'} />
                  </EuiToolTip>
                ),
              },
              {
                field: 'id',
                name: intl.formatMessage({
                  id: 'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.idColumnName', defaultMessage: 'Id'
                }),
              },
              {
                field: 'meta.title',
                name: intl.formatMessage({
                  id: 'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.titleColumnName',
                  defaultMessage: 'Title',
                }),
              },
            ]}
            pagination={true}
            sorting={false}
          />
        </EuiConfirmModal>
      );
    }

    return (
      <EuiOverlayMask>
        {modal}
      </EuiOverlayMask>
    );
  }

  changeIncludeReferencesDeep = () => {
    this.setState(state => ({
      isIncludeReferencesDeepChecked: !state.isIncludeReferencesDeepChecked,
    }));
  }

  closeExportAllModal = () => {
    this.setState({ isShowingExportAllOptionsModal: false });
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
      <EuiOverlayMask>
        <EuiModal
          onClose={this.closeExportAllModal}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="kbn.management.objects.objectsTable.exportObjectsConfirmModalTitle"
                defaultMessage="Export {filteredItemCount, plural, one{# object} other {# objects}}"
                values={{
                  filteredItemCount
                }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow
              label={<FormattedMessage
                id="kbn.management.objects.objectsTable.exportObjectsConfirmModalDescription"
                defaultMessage="Select which types to export"
              />}
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
            <EuiSwitch
              name="includeReferencesDeep"
              label={(
                <FormattedMessage
                  id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.includeReferencesDeepLabel"
                  defaultMessage="Include related objects"
                />
              )}
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

    const selectionConfig = {
      onSelectionChange: this.onSelectionChanged,
    };

    const filterOptions = this.savedObjectTypes.map(type => ({
      value: type,
      name: type,
      view: `${type} (${savedObjectCounts[type] || 0})`,
    }));

    const canDeleteSavedObjectTypes = POSSIBLE_TYPES.filter(type => {
      return this.props.uiCapabilities.savedObjectsManagement[type].delete;
    });

    return (
      <EuiPageContent
        horizontalPosition="center"
      >
        {this.renderFlyout()}
        {this.renderRelationships()}
        {this.renderDeleteConfirmModal()}
        {this.renderExportAllOptionsModal()}
        <Header
          onExportAll={() =>
            this.setState({ isShowingExportAllOptionsModal: true })
          }
          onImport={this.showImportFlyout}
          onRefresh={this.refreshData}
          filteredCount={filteredItemCount}
        />
        <EuiSpacer size="xs" />
        <Table
          itemId={'id'}
          selectionConfig={selectionConfig}
          selectedSavedObjects={selectedSavedObjects}
          onQueryChange={this.onQueryChange}
          onTableChange={this.onTableChange}
          filterOptions={filterOptions}
          onExport={this.onExport}
          canDeleteSavedObjectTypes={canDeleteSavedObjectTypes}
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

export const ObjectsTable = injectI18n(ObjectsTableUI);
