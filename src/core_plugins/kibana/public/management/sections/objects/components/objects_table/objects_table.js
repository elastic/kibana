import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { flattenDeep } from 'lodash';
import { createSelector } from 'reselect';
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

export class ObjectsTable extends Component {
  static propTypes = {
    savedObjectsClient: PropTypes.object.isRequired,
    $http: PropTypes.func.isRequired,
    notify: PropTypes.object.isRequired,
    kbnIndex: PropTypes.string.isRequired,
    clientSideSearchThreshold: PropTypes.number,
    services: PropTypes.array.isRequired,
  };

  static defaultProps = {
    clientSideSearchThreshold: 500,
  };

  constructor(props) {
    super(props);

    this.state = {
      savedObjects: [],
      totalCount: 0,
      activeType: 'dashboard',
      activeQuery: '',
      selectedSavedObjectIds: [],
      clientSideSearchingEnabled: false,
      isPerformingInitialFetch: false,
      isShowingImportFlyout: false,
    };
  }

  componentWillMount() {
    this.fetchAllData();
  }

  fetchAllData = async () => {
    const { clientSideSearchThreshold } = this.props;

    this.setState({ isPerformingInitialFetch: true });

    const { pageOfItems, totalItemCount } = await this.fetchSavedObjects(
      Query.parse('')
    );
    const clientSideSearchingEnabled =
      totalItemCount < clientSideSearchThreshold;

    this.setState({
      savedObjects: pageOfItems,
      clientSideSearchingEnabled,
      isPerformingInitialFetch: false,
    });
  };

  fetchSavedObjects = async (query, pageIndex, pageSize) => {
    const {
      savedObjectsClient,
      clientSideSearchThreshold,
    } = this.props;

    if (!query) {
      return {
        pageOfItems: [],
        totalItemCount: 0,
      };
    }

    const queryText = getQueryText(query);
    const visibleTypes =
      query && query.ast.getFieldClauses('type')
        ? query.ast.getFieldClauses('type')[0].value
        : undefined;

    let savedObjects = [];
    let totalItemCount = 0;

    const page = isNaN(pageIndex) ? 1 : (pageIndex || 0) + 1;
    const perPage = isNaN(pageSize)
      ? clientSideSearchThreshold + 1
      : pageSize;

    // TODO: is there a good way to stop existing calls if the input changes?
    await smoothServerInteraction(async () => {
      const data = await savedObjectsClient.find({
        search: queryText ? `${queryText}*` : undefined,
        perPage,
        page,
        fields: ['title', 'id'],
      });

      savedObjects = data.savedObjects.reduce((accum, savedObject) => {
        if (!EXCLUDED_TYPES.includes(savedObject.type)) {
          accum.push({
            title: savedObject.attributes.title,
            type: savedObject.type,
            id: savedObject.id,
            icon: getSavedObjectIcon(savedObject.type),
          });
        }
        return accum;
      }, []);

      if (visibleTypes) {
        savedObjects = savedObjects.filter(savedObject =>
          visibleTypes.includes(savedObject.type)
        );
      }

      totalItemCount = data.total;
    });

    return {
      pageOfItems: savedObjects,
      totalItemCount,
    };
  };

  onSelectionChanged = selection => {
    const selectedSavedObjectIds = selection.map(item => item.id);
    this.setState({ selectedSavedObjectIds });
  };

  onSearchChanged = query => {
    this.setState({ activeQuery: query });
  };

  onExport = async () => {
    const { savedObjects, selectedSavedObjectIds } = this.state;
    const objects = savedObjects.filter(({ id }) => selectedSavedObjectIds.includes(id));
    await retrieveAndExportDocs(objects, this.props.savedObjectsClient);
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

  onDelete = async () => {
    const { savedObjectsClient } = this.props;
    const { savedObjects, selectedSavedObjectIds } = this.state;
    const objects = savedObjects.filter(({ id }) => selectedSavedObjectIds.includes(id));
    const deletes = objects.map(object => savedObjectsClient.delete(object.type, object.id));
    await Promise.all(deletes);

    // Unset this
    this.setState({ selectedSavedObjectIds: [] });

    // Fetching all data
    await this.fetchAllData();
  }

  getFilterOptions = createSelector(
    savedObjects => savedObjects,
    savedObjects => {
      // Build a unique list of saved object types
      return Object.values(
        savedObjects.reduce((options, { type }) => {
          if (!options[type]) {
            options[type] = {
              value: type,
              name: type,
              view: type[0].toUpperCase() + type.slice(1),
            };
          }
          return options;
        }, {})
      );
    }
  );

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
    const { savedObjects, clientSideSearchingEnabled, isPerformingInitialFetch, selectedSavedObjectIds } = this.state;

    const selectionConfig = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChanged,
    };

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
          items={savedObjects}
          selectionConfig={selectionConfig}
          selectedSavedObjectIds={selectedSavedObjectIds}
          onSearchChanged={this.onSearchChanged}
          clientSideSearchingEnabled={clientSideSearchingEnabled}
          isPerformingInitialFetch={isPerformingInitialFetch}
          filterOptions={this.getFilterOptions(savedObjects)}
          fetchData={this.fetchSavedObjects}
          onExport={this.onExport}
          onDelete={this.onDelete}
        />
        <EuiSpacer size="xxl" />
      </Fragment>
    );
  }
}
