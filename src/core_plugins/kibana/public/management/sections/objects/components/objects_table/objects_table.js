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
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiCheckboxGroup,
  EuiToolTip,
  EuiPage,
  EuiPageContent,
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
import { isSameQuery } from '../../lib/is_same_query';

export const INCLUDED_TYPES = [
  'index-pattern',
  'visualization',
  'dashboard',
  'search',
];

export class ObjectsTable extends Component {
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
      savedObjectCounts: INCLUDED_TYPES.reduce((accum, type) => {
        accum[type] = 0;
        return accum;
      }, {}),
      activeQuery: Query.parse(''),
      selectedSavedObjects: [],
      isShowingImportFlyout: false,
      isSearching: false,
      totalItemCount: 0,
      isShowingRelationships: false,
      relationshipId: undefined,
      relationshipType: undefined,
      relationshipTitle: undefined,
      isShowingDeleteConfirmModal: false,
      isShowingExportAllOptionsModal: false,
      isDeleting: false,
      exportAllOptions: INCLUDED_TYPES.map(type => ({
        id: type,
        label: type,
      })),
      exportAllSelectedOptions: INCLUDED_TYPES.reduce((accum, type) => {
        accum[type] = true;
        return accum;
      }, {}),
    };
  }

  componentWillMount() {
    this.fetchSavedObjects();
    this.fetchCounts();
  }

  fetchCounts = async () => {
    const { queryText, visibleTypes } = parseQuery(this.state.activeQuery);
    const type = INCLUDED_TYPES.filter(
      type => !visibleTypes || visibleTypes.includes(type)
    );

    const savedObjectCounts = await getSavedObjectCounts(
      this.props.$http,
      type,
      queryText
    );

    this.setState(state => ({
      ...state,
      savedObjectCounts,
      exportAllOptions: state.exportAllOptions.map(option => ({
        ...option,
        label: `${option.id} (${savedObjectCounts[option.id]})`,
      })),
    }));
  };

  fetchSavedObjects = async () => {
    const { savedObjectsClient } = this.props;
    const { activeQuery, page, perPage } = this.state;

    if (!activeQuery) {
      return {
        pageOfItems: [],
        totalItemCount: 0,
      };
    }

    this.setState({ isSearching: true });

    const { queryText, visibleTypes } = parseQuery(activeQuery);

    let savedObjects = [];
    let totalItemCount = 0;

    const type = INCLUDED_TYPES.filter(
      type => !visibleTypes || visibleTypes.includes(type)
    );

    // TODO: is there a good way to stop existing calls if the input changes?
    await ensureMinimumTime(
      (async () => {
        const data = await savedObjectsClient.find({
          search: queryText ? `${queryText}*` : undefined,
          perPage,
          page: page + 1,
          sortField: 'type',
          fields: ['title', 'id'],
          searchFields: ['title'],
          type,
        });

        savedObjects = data.savedObjects.map(savedObject => ({
          title: savedObject.attributes.title,
          type: savedObject.type,
          id: savedObject.id,
          icon: getSavedObjectIcon(savedObject.type),
        }));

        totalItemCount = data.total;
      })()
    );

    this.setState({ savedObjects, totalItemCount, isSearching: false });
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
    // TODO: investigate why this happens at EUI level
    if (isSameQuery(query, this.state.activeQuery)) {
      return;
    }

    this.setState(
      {
        activeQuery: query,
        page: 0, // Reset this on each query change
      },
      () => {
        this.fetchSavedObjects();
        this.fetchCounts();
      }
    );
  };

  onTableChange = async table => {
    const { index: page, size: perPage } = table.page || {};

    this.setState({ page, perPage }, this.fetchSavedObjects);
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
      isShowingDeleteConfirmModal: false,
      isDeleting: false,
    });

    // Fetching all data
    await this.fetchSavedObjects();
    await this.fetchCounts();
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
    if (!this.state.isShowingDeleteConfirmModal) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Delete saved objects"
          onCancel={() => this.setState({ isShowingDeleteConfirmModal: false })}
          onConfirm={this.delete}
          cancelButtonText="Cancel"
          confirmButtonText={this.state.isDeleting ? 'Deleting...' : 'Delete'}
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>This action will delete the following saved objects:</p>
          <EuiInMemoryTable
            items={this.state.selectedSavedObjects}
            columns={[
              {
                field: 'type',
                name: 'Type',
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
                name: 'Id/Name',
              },
            ]}
            pagination={true}
            sorting={false}
          />
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  renderExportAllOptionsModal() {
    if (!this.state.isShowingExportAllOptionsModal) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Export All"
          onCancel={() =>
            this.setState({ isShowingExportAllOptionsModal: false })
          }
          onConfirm={this.onExportAll}
          cancelButtonText="Cancel"
          confirmButtonText="Export All"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        >
          <p>
            Select which types to export. The number in parentheses indicates
            how many of this type are available to export.
          </p>
          <EuiCheckboxGroup
            options={this.state.exportAllOptions}
            idToSelectedMap={this.state.exportAllSelectedOptions}
            onChange={optionId => {
              const exportAllSelectedOptions = {
                ...this.state.exportAllSelectedOptions,
                ...{
                  [optionId]: !this.state.exportAllSelectedOptions[optionId],
                },
              };

              this.setState({
                exportAllSelectedOptions: exportAllSelectedOptions,
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
      totalItemCount,
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
        <EuiPageContent verticalPosition="center" horizontalPosition="center" style={{ maxWidth: 1000, marginTop: 16, marginBottom: 16 }}>
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
            totalCount={totalItemCount}
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
            totalItemCount={totalItemCount}
            isSearching={isSearching}
            onShowRelationships={this.onShowRelationships}
          />
        </EuiPageContent>
      </EuiPage>
    );
  }
}
