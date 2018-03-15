import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { Header } from './components/header';
import { Table } from './components/table';

import { EuiSpacer, EuiHorizontalRule, Query } from '@elastic/eui';

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

export class ObjectsTable extends Component {
  static propTypes = {
    savedObjectsClient: PropTypes.object.isRequired,
    clientSideSearchThreshold: PropTypes.number,
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

      savedObjects = data.savedObjects.map(savedObject => ({
        title: savedObject.attributes.title,
        type: savedObject.type,
        id: savedObject.id,
        icon: getSavedObjectIcon(savedObject.type),
      }));

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

  render() {
    const { savedObjects, clientSideSearchingEnabled, isPerformingInitialFetch } = this.state;

    const selectionConfig = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChanged,
    };

    return (
      <Fragment>
        <Header />
        <EuiSpacer size="xs" />
        <EuiHorizontalRule margin="s" />
        <Table
          items={savedObjects}
          selectionConfig={selectionConfig}
          onSearchChanged={this.onSearchChanged}
          clientSideSearchingEnabled={clientSideSearchingEnabled}
          isPerformingInitialFetch={isPerformingInitialFetch}
          filterOptions={this.getFilterOptions(savedObjects)}
          fetchData={this.fetchSavedObjects}
        />
        <EuiSpacer size="xxl" />
      </Fragment>
    );
  }
}
