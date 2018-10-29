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
import PropTypes from 'prop-types';
import { flattenDeep } from 'lodash';
import { Header } from './components/header';
import { Flyout } from './components/flyout';
import { Relationships } from './components/relationships';
import { Table } from './components/table';

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
  EuiPage,
  EuiPageContent,
  EuiPageBody,
} from '@elastic/eui';
import {
  retrieveAndExportDocs,
  scanAllTypes,
  saveToFile,
  parseQuery,
  getSavedObjectIcon,
  getSavedObjectCounts,
  getRelationships,
  getSavedObjectLabel,
} from '../../lib';
import { ensureMinimumTime } from '../../../indices/create_index_pattern_wizard/lib/ensure_minimum_time';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export const INCLUDED_TYPES = [
  'index-pattern',
  'visualization',
  'dashboard',
  'search',
];

class ObjectsTableUI extends Component {
  static propTypes = {
    savedObjectsClient: PropTypes.object.isRequired,
    indexPatterns: PropTypes.object.isRequired,
    $http: PropTypes.func.isRequired,
    basePath: PropTypes.string.isRequired,
    perPageConfig: PropTypes.number,
    newIndexPatternUrl: PropTypes.string.isRequired,
    services: PropTypes.array.isRequired,
    getEditUrl: PropTypes.func.isRequired,
    goInApp: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      totalCount: 0,
      page: 0,
      perPage: props.perPageConfig || 50,
      savedObjects: [],
      savedObjectCounts: INCLUDED_TYPES.reduce((typeToCountMap, type) => {
        typeToCountMap[type] = 0;
        return typeToCountMap;
      }, {}),
      activeQuery: Query.parse(''),
      selectedSavedObjects: [],
      isShowingImportFlyout: false,
      isSearching: false,
      filteredItemCount: 0,
      isShowingRelationships: false,
      relationshipId: undefined,
      relationshipType: undefined,
      relationshipTitle: undefined,
      isShowingDeleteConfirmModal: false,
      isShowingExportAllOptionsModal: false,
      isDeleting: false,
      exportAllOptions: [],
      exportAllSelectedOptions: {},
    };
  }

  componentWillMount() {
    this.fetchSavedObjects();
    this.fetchCounts();
  }

  fetchCounts = async () => {
    const { queryText, visibleTypes } = parseQuery(this.state.activeQuery);

    const filteredTypes = INCLUDED_TYPES.filter(
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
      INCLUDED_TYPES,
      queryText
    );

    this.setState(state => ({
      ...state,
      savedObjectCounts,
      exportAllOptions,
      exportAllSelectedOptions,
    }));
  };

  fetchSavedObjects = async () => {
    const { savedObjectsClient } = this.props;
    const { activeQuery, page, perPage } = this.state;

    this.setState({ isSearching: true });

    const { queryText, visibleTypes } = parseQuery(activeQuery);

    let savedObjects = [];
    let filteredItemCount = 0;

    const type = INCLUDED_TYPES.filter(
      type => !visibleTypes || visibleTypes.includes(type)
    );

    // TODO: is there a good way to stop existing calls if the input changes?
    await ensureMinimumTime(
      (async () => {
        const filteredSavedObjects = await savedObjectsClient.find({
          search: queryText ? `${queryText}*` : undefined,
          perPage,
          page: page + 1,
          sortField: 'type',
          fields: ['title', 'id'],
          searchFields: ['title'],
          type,
        });

        savedObjects = filteredSavedObjects.savedObjects.map(savedObject => ({
          title: savedObject.attributes.title,
          type: savedObject.type,
          id: savedObject.id,
          icon: getSavedObjectIcon(savedObject.type),
        }));

        filteredItemCount = filteredSavedObjects.total;
      })()
    );

    this.setState({
      savedObjects,
      filteredItemCount,
      isSearching: false,
    });
  };

  refreshData = async () => {
    await Promise.all([this.fetchSavedObjects(), this.fetchCounts()]);
  };

  onSelectionChanged = selection => {
    const selectedSavedObjects = selection.map(item => ({
      id: item.id,
      type: item.type,
    }));
    this.setState({ selectedSavedObjects });
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

  onShowRelationships = (id, type, title) => {
    this.setState({
      isShowingRelationships: true,
      relationshipId: id,
      relationshipType: type,
      relationshipTitle: title,
    });
  };

  onHideRelationships = () => {
    this.setState({
      isShowingRelationships: false,
      relationshipId: undefined,
      relationshipType: undefined,
      relationshipTitle: undefined,
    });
  };

  onExport = async () => {
    const { savedObjectsClient } = this.props;
    const { selectedSavedObjects } = this.state;
    const objects = await savedObjectsClient.bulkGet(selectedSavedObjects);
    await retrieveAndExportDocs(objects.savedObjects, savedObjectsClient);
  };

  onExportAll = async () => {
    const { $http } = this.props;
    const { exportAllSelectedOptions } = this.state;

    const exportTypes = Object.entries(exportAllSelectedOptions).reduce(
      (accum, [id, selected]) => {
        if (selected) {
          accum.push(id);
        }
        return accum;
      },
      []
    );
    const results = await scanAllTypes($http, exportTypes);
    saveToFile(JSON.stringify(flattenDeep(results), null, 2));
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
      />
    );
  }

  renderRelationships() {
    if (!this.state.isShowingRelationships) {
      return null;
    }

    return (
      <Relationships
        id={this.state.relationshipId}
        type={this.state.relationshipType}
        title={this.state.relationshipTitle}
        getRelationships={this.getRelationships}
        close={this.onHideRelationships}
        getDashboardUrl={this.props.getDashboardUrl}
        getEditUrl={this.props.getEditUrl}
        goInApp={this.props.goInApp}
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
                render: type => (
                  <EuiToolTip
                    position="top"
                    content={getSavedObjectLabel(type)}
                  >
                    <EuiIcon type={getSavedObjectIcon(type)} />
                  </EuiToolTip>
                ),
              },
              {
                field: 'id',
                name: intl.formatMessage({
                  id: 'kbn.management.objects.objectsTable.deleteSavedObjectsConfirmModal.idColumnName', defaultMessage: 'Id/Name'
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

  renderExportAllOptionsModal() {
    const {
      isShowingExportAllOptionsModal,
      filteredItemCount,
      exportAllOptions,
      exportAllSelectedOptions,
    } = this.state;

    if (!isShowingExportAllOptionsModal) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={(<FormattedMessage
            id="kbn.management.objects.objectsTable.exportObjectsConfirmModalTitle"
            defaultMessage="Export {filteredItemCount, plural, one{# object} other {# objects}}"
            values={{
              filteredItemCount
            }}
          />)}
          onCancel={() =>
            this.setState({ isShowingExportAllOptionsModal: false })
          }
          onConfirm={this.onExportAll}
          cancelButtonText={(
            <FormattedMessage id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.cancelButtonLabel" defaultMessage="Cancel"/>
          )}
          confirmButtonText={(
            <FormattedMessage
              id="kbn.management.objects.objectsTable.exportObjectsConfirmModal.exportAllButtonLabel"
              defaultMessage="Export All"
            />
          )}
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            <FormattedMessage
              id="kbn.management.objects.objectsTable.exportObjectsConfirmModalDescription"
              defaultMessage="Select which types to export. The number in parentheses indicates
              how many of this type are available to export."
            />
          </p>
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
        </EuiConfirmModal>
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

    const filterOptions = INCLUDED_TYPES.map(type => ({
      value: type,
      name: type,
      view: `${type} (${savedObjectCounts[type] || 0})`,
    }));

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            style={{ maxWidth: 1000, marginTop: 16, marginBottom: 16 }}
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
              onDelete={this.onDelete}
              getEditUrl={this.props.getEditUrl}
              goInApp={this.props.goInApp}
              pageIndex={page}
              pageSize={perPage}
              items={savedObjects}
              totalItemCount={filteredItemCount}
              isSearching={isSearching}
              onShowRelationships={this.onShowRelationships}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const ObjectsTable = injectI18n(ObjectsTableUI);
