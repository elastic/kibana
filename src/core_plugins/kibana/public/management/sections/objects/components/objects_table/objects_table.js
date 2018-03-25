import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { flattenDeep } from 'lodash';
import { Header } from './components/header';
import { Flyout } from './components/flyout';
import { Relationships } from './components/relationships';
import { Table } from './components/table';

import { EuiSpacer, EuiHorizontalRule, Query } from '@elastic/eui';
import { retrieveAndExportDocs } from '../../lib/retrieve_and_export_docs';
import { scanAllTypes } from '../../lib/scan_all_types';
import { saveToFile } from '../../lib/save_to_file';
import { getQueryText } from '../../lib/get_query_text';
import { getSavedObjectIcon } from '../../lib/get_saved_object_icon';
import { ensureMinimumTime } from '../../../indices/create_index_pattern_wizard/lib/ensure_minimum_time';
import { getRelationships } from '../../lib/get_relationships';

export const INCLUDED_TYPES = ['index-pattern', 'visualization', 'dashboard', 'search'];

export class ObjectsTable extends Component {
  static propTypes = {
    savedObjectsClient: PropTypes.object.isRequired,
    indexPatterns: PropTypes.object.isRequired,
    $http: PropTypes.func.isRequired,
    basePath: PropTypes.string.isRequired,
    newIndexPatternUrl: PropTypes.string.isRequired,
    kbnIndex: PropTypes.string.isRequired,
    services: PropTypes.array.isRequired,
    getDashboardUrl: PropTypes.func.isRequired,
    getVisualizationUrl: PropTypes.func.isRequired,
    getEditUrl: PropTypes.func.isRequired,
    getInAppUrl: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      totalCount: 0,
      page: 0,
      perPage: 10,
      savedObjects: [],
      activeQuery: Query.parse(''),
      selectedSavedObjects: [],
      isShowingImportFlyout: false,
      isSearching: false,
      totalItemCount: 0,
      isShowingRelationships: false,
      relationshipId: undefined,
      relationshipType: undefined,
      relationshipTitle: undefined,
    };
  }

  componentWillMount() {
    this.fetchSavedObjects();
  }

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

    const queryText = getQueryText(activeQuery);
    const visibleTypes =
      activeQuery && activeQuery.ast.getFieldClauses('type')
        ? activeQuery.ast.getFieldClauses('type')[0].value
        : undefined;

    let savedObjects = [];
    let totalItemCount = 0;

    const includeTypes = INCLUDED_TYPES.filter(type => !visibleTypes || visibleTypes.includes(type));

    // TODO: is there a good way to stop existing calls if the input changes?
    await ensureMinimumTime((async () => {
      const data = await savedObjectsClient.find({
        search: queryText ? `${queryText}*` : undefined,
        perPage,
        page: page + 1,
        sortField: 'type',
        fields: ['title', 'id'],
        includeTypes,
      });

      savedObjects = data.savedObjects.map(savedObject => ({
        title: savedObject.attributes.title,
        type: savedObject.type,
        id: savedObject.id,
        icon: getSavedObjectIcon(savedObject.type),
      }));

      totalItemCount = data.total;
    })());

    this.setState({ savedObjects, totalItemCount, isSearching: false });
  };

  onSelectionChanged = selection => {
    const selectedSavedObjects = selection.map(item => ({
      id: item.id,
      type: item.type,
    }));
    this.setState({ selectedSavedObjects });
  };

  onQueryChange = query => {
    this.setState({ activeQuery: query }, this.fetchSavedObjects);
  };

  onTableChange = async (table) => {
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
  }

  onHideRelationships = () => {
    this.setState({
      isShowingRelationships: false,
      relationshipId: undefined,
      relationshipType: undefined,
      relationshipTitle: undefined,
    });
  }

  onExport = async () => {
    const { savedObjectsClient } = this.props;
    const { selectedSavedObjects } = this.state;
    const objects = await savedObjectsClient.bulkGet(selectedSavedObjects);
    await retrieveAndExportDocs(objects.savedObjects, savedObjectsClient);
  }

  onExportAll = async () => {
    const { kbnIndex, $http } = this.props;
    const results = await scanAllTypes($http, kbnIndex, INCLUDED_TYPES);
    saveToFile(JSON.stringify(flattenDeep(results.hits), null, 2));
  }

  finishImport = () => {
    this.hideImportFlyout();
    this.fetchSavedObjects();
  }

  showImportFlyout = () => {
    this.setState({ isShowingImportFlyout: true });
  }

  hideImportFlyout = () => {
    this.setState({ isShowingImportFlyout: false });
  }

  onDelete = async (page, perPage) => {
    const { savedObjectsClient } = this.props;
    const { selectedSavedObjects } = this.state;
    const objects = await savedObjectsClient.bulkGet(selectedSavedObjects);
    const deletes = objects.savedObjects.map(object => savedObjectsClient.delete(object.type, object.id));
    await Promise.all(deletes);

    // Unset this
    this.setState({ selectedSavedObjects: [] });

    // Fetching all data
    await this.fetchSavedObjects(Query.parse(''), page, perPage);
  }

  getRelationships = async (type, id) => {
    return await getRelationships(type, id, this.props.$http, this.props.basePath);
  }

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
        getVisualizationUrl={this.props.getVisualizationUrl}
      />
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
    } = this.state;

    const selectionConfig = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChanged,
    };

    const filterOptions = INCLUDED_TYPES.map(type => ({
      value: type,
      name: type,
      view: type[0].toUpperCase() + type.slice(1),
    }));

    return (
      <Fragment>
        {this.renderFlyout()}
        {this.renderRelationships()}
        <Header
          onExportAll={this.onExportAll}
          onImport={this.showImportFlyout}
          onRefresh={this.fetchSavedObjects}
        />
        <EuiSpacer size="xs" />
        <EuiHorizontalRule margin="s" />
        <Table
          selectionConfig={selectionConfig}
          selectedSavedObjects={selectedSavedObjects}
          onQueryChange={this.onQueryChange}
          onTableChange={this.onTableChange}
          filterOptions={filterOptions}
          fetchData={this.fetchSavedObjects}
          onExport={this.onExport}
          onDelete={this.onDelete}
          getEditUrl={this.props.getEditUrl}
          getInAppUrl={this.props.getInAppUrl}
          pageIndex={page}
          pageSize={perPage}
          items={savedObjects}
          totalItemCount={totalItemCount}
          isSearching={isSearching}
          onShowRelationships={this.onShowRelationships}
        />
      </Fragment>
    );
  }
}
