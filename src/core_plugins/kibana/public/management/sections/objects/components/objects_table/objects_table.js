import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { Header } from './components/header';
// import { Tabs } from './components/tabs';
// import { Toolbar } from './components/toolbar';
import { Table } from './components/table';
import { NoResults } from './components/no_results';

import { EuiSpacer, EuiHorizontalRule } from '@elastic/eui';

// const TAB_CONFIG = [
//   {
//     id: 'dashboard',
//     name: 'Dashboards',
//     disabled: false,
//   },
//   {
//     id: 'search',
//     name: 'Searches',
//     disabled: false,
//   },
//   {
//     id: 'visualization',
//     name: 'Visualizations',
//     disabled: false,
//   },
// ];

async function smoothServerInteraction(block, minimumTimeMs = 300) {
  return await ensureMinimumTime(block, minimumTimeMs);
}

// let timeoutId;
// async function cancelPreviousAttempts(block, timeToBlockMs = 100) {
//   timeoutId && clearTimeout(timeoutId);
//   return new Promise(resolve => {
//     timeoutId = setTimeout(async () => {
//       await block();
//       resolve();
//     }, timeToBlockMs);
//   });
// }

// TODO: maybe use this in the other tables too
async function ensureMinimumTime(block, minimumTimeMs = 300) {
  // console.log(`ensureMinimumTime() minimumTimeMs=${minimumTimeMs}`);
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
    clientSideSearchThreshold: 10,
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
    };
  }

  componentWillMount() {
    this.setupData();
  }

  setupData = async () => {
    const { clientSideSearchThreshold } = this.props;

    const { pageOfItems } = await this.fetchSavedObjects();
    // const totalCount = savedObjects.length;
    const clientSideSearchingEnabled =
      pageOfItems.length < clientSideSearchThreshold;

    this.setState({
      savedObjects: pageOfItems,
      clientSideSearchingEnabled,
    });
  };

  fetchSavedObjects = async (
    query,
    pageIndex,
    pageSize,
    // sortField,
    // sortDirection
  ) => {
    const {
      savedObjectsClient,
      clientSideSearchThreshold,
      clientSideSearchingEnabled,
    } = this.props;

    const queryText = getQueryText(query);
    const visibleTypes =
      query && query.ast.getFieldClauses('type')
        ? query.ast.getFieldClauses('type')[0].value
        : undefined;

    let savedObjects = [];
    let totalItemCount = 0;

    const page = clientSideSearchingEnabled ? 1 : (pageIndex || 0) + 1;
    const perPage = clientSideSearchingEnabled
      ? clientSideSearchThreshold + 1
      : pageSize;

    // TODO: is there a good way to stop existing calls if the input changes?
    await smoothServerInteraction(async () => {
      const data = await savedObjectsClient.find({
        search: queryText ? `${queryText}*` : undefined,
        perPage,
        page,
        // sortField,
        // sortOrder: sortDirection,
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

  getFilteredSavedObjects = createSelector(
    state => state.savedObjects,
    state => state.activeQuery,
    state => state.activeType,
    (savedObjects, activeQuery, activeType) => {
      const lowercaseQuery = getQueryText(activeQuery).toLowerCase();
      const filteredSavedObjects = savedObjects.filter(savedObject => {
        if (activeType && activeType !== savedObject.type) {
          return false;
        }
        if (
          lowercaseQuery &&
          !savedObject.title.toLowerCase().includes(lowercaseQuery)
        ) {
          return false;
        }
        return true;
      });
      return filteredSavedObjects;
    }
  );

  onSelectionChanged = selection => {
    const selectedSavedObjectIds = selection.map(item => item.id);
    this.setState({ selectedSavedObjectIds });
  };

  changeTab = type => {
    this.setState({ activeType: type });
  };

  onSearchChanged = query => {
    this.setState({ activeQuery: query });
  };

  render() {
    const {
      // activeType,
      savedObjects,
      // activeQuery,
      clientSideSearchingEnabled,
      // totalCount,
    } = this.state;

    // const tabConfig = TAB_CONFIG.map(tab => ({
    //   ...tab,
    //   count: savedObjects.filter(obj => obj.type === tab.id).length,
    // }));
    // const currentTab = tabConfig.find(tab => tab.id === activeType);

    const filteredSavedObjects = this.getFilteredSavedObjects(this.state);
    const selectionConfig = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChanged,
    };

    // Build a unique list of saved object types
    const filterOptions = Object.values(
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

    return (
      <div>
        <Header />
        {/* <Tabs
          tabConfig={tabConfig}
          changeTab={this.changeTab}
          selectedTabId={activeType}
        /> */}
        <EuiSpacer size="xs" />
        {/* <Toolbar
          onSearchChanged={this.onSearchChanged}
          searchQuery={activeQuery}
        /> */}
        <EuiHorizontalRule margin="s" />
        {true ? (
          <Table
            items={filteredSavedObjects}
            selectionConfig={selectionConfig}
            onSearchChanged={this.onSearchChanged}
            clientSideSearchingEnabled={clientSideSearchingEnabled}
            filterOptions={filterOptions}
            fetchData={this.fetchSavedObjects}
          />
        ) : (
          <NoResults/>
        )}
        <EuiSpacer size="xxl" />
      </div>
    );
  }
}
