import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { flattenDeep } from 'lodash';
import { Header } from './components/header';
import { Table } from './components/table';

import { EuiSpacer, EuiHorizontalRule, Query } from '@elastic/eui';
import { retrieveAndExportDocs } from '../../lib/retrieve_and_export_docs';
import { scanAllTypes } from '../../lib/scan_all_types';
import { saveToFile } from '../../lib/save_to_file';
import { Flyout } from './components/flyout';

async function smoothServerInteraction(block, minimumTimeMs = 300) {
  return await ensureMinimumTime(block, minimumTimeMs);
}

// TODO: maybe use this in the other tables too
async function ensureMinimumTime(block, minimumTimeMs = 300) {
  const start = +new Date();
  await block();
  const end = +new Date();
  const duration = end - start;

  if (duration < minimumTimeMs) {
    const timeToAdd = minimumTimeMs - (end - start);
    await new Promise(resolve => setTimeout(resolve, timeToAdd));
  }
}

function getQueryText(query) {
  return query && query.ast.getTermClauses().length
    ? query.ast
      .getTermClauses()
      .map(clause => clause.value)
      .join(' ')
    : '';
}

function getSavedObjectIcon(type) {
  switch (type) {
    case 'search':
      return 'search';
    case 'visualization':
      return 'visualizeApp';
    case 'dashboard':
      return 'dashboardApp';
    case 'index-pattern':
      return 'indexPatternApp';
    case 'tag':
      return 'apps';
  }
}

export const EXCLUDED_TYPES = ['config'];
export const INCLUDED_TYPES = ['index-pattern', 'visualization', 'dashboard', 'search'];

export class ObjectsTable extends Component {
  static propTypes = {
    savedObjectsClient: PropTypes.object.isRequired,
    $http: PropTypes.func.isRequired,
    notify: PropTypes.object.isRequired,
    kbnIndex: PropTypes.string.isRequired,
    services: PropTypes.array.isRequired,
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

    const excludeTypes = [
      ...EXCLUDED_TYPES,
      ...INCLUDED_TYPES.filter(type => visibleTypes && !visibleTypes.includes(type)),
    ];

    // TODO: is there a good way to stop existing calls if the input changes?
    await smoothServerInteraction(async () => {
      const data = await savedObjectsClient.find({
        search: queryText ? `${queryText}*` : undefined,
        perPage,
        page: page + 1,
        fields: ['title', 'id'],
        excludeTypes,
      });

      savedObjects = data.savedObjects.map(savedObject => ({
        title: savedObject.attributes.title,
        type: savedObject.type,
        id: savedObject.id,
        icon: getSavedObjectIcon(savedObject.type),
      }));

      totalItemCount = data.total;
    });

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

  onExport = async () => {
    const { savedObjectsClient } = this.props;
    const { selectedSavedObjects } = this.state;
    const objects = await savedObjectsClient.bulkGet(selectedSavedObjects);
    await retrieveAndExportDocs(objects.savedObjects, savedObjectsClient);
  }

  onExportAll = async () => {
    const { kbnIndex, $http } = this.props;
    const results = await scanAllTypes($http, kbnIndex, EXCLUDED_TYPES);
    saveToFile(JSON.stringify(flattenDeep(results.hits), null, 2));
  }

  finishImport = () => {
    this.hideImportFlyout();
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

  renderFlyout() {
    if (!this.state.isShowingImportFlyout) {
      return null;
    }

    return (
      <Flyout
        close={this.hideImportFlyout}
        done={this.finishImport}
        services={this.props.services}
        savedObjectsClient={this.props.savedObjectsClient}
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
        <Header
          onExportAll={this.onExportAll}
          onImport={this.showImportFlyout}
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
          pageIndex={page}
          pageSize={perPage}
          items={savedObjects}
          totalItemCount={totalItemCount}
          isSearching={isSearching}
        />
        <EuiSpacer size="xxl" />
      </Fragment>
    );
  }
}
