import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Header } from './components/header';
import { Tabs } from './components/tabs';
import { Toolbar } from './components/toolbar';
import { Table } from './components/table';
import { NoResults } from './components/no_results';

import {
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';

const TAB_CONFIG = [
  {
    id: 'dashboard',
    name: 'Dashboards',
    disabled: false,
  },
  {
    id: 'search',
    name: 'Searches',
    disabled: false,
  },
  {
    id: 'visualization',
    name: 'Visualizations',
    disabled: false,
  }
];

const FETCH_SIZE = 1000;

export class ObjectsTable extends Component {
  static propTypes = {
    services: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      savedObjects: [],
      activeType: 'dashboard',
      activeQuery: '',
      selectedSavedObjectIds: [],
      clientSideSearchingEnabled: false,
    };
  }

  componentWillMount() {
    this.fetchSavedObjects();
  }

  fetchSavedObjects = async () => {
    if (this.state.clientSideSearchingEnabled) {
      return;
    }

    const { services } = this.props;
    const { activeQuery } = this.state;

    const savedObjects = [];

    for (const { service } of services) {
      const data = await service.findAll(activeQuery, FETCH_SIZE, ['title', 'id']);
      for (const hit of data.hits) {
        savedObjects.push({
          ...hit,
          // service: service,
          // serviceName,
          // title: title,
          type: service.type,
          // data: data.hits,
          // total: data.total
        });
      }
    }

    const clientSideSearchingEnabled = savedObjects.length < FETCH_SIZE;

    this.setState({
      savedObjects,
      clientSideSearchingEnabled,
    });
  }

  getFilteredSavedObjects(
    savedObjects = this.state.savedObjects,
    activeQuery = this.state.activeQuery,
    activeType = this.state.activeType
  ) {
    const lowercaseQuery = activeQuery.toLowerCase();
    const filteredSavedObjects = savedObjects.filter(savedObject => {
      if (activeType && activeType !== savedObject.type) {
        return false;
      }
      if (lowercaseQuery && !savedObject.title.toLowerCase().includes(lowercaseQuery)) {
        return false;
      }
      return true;
    });
    return filteredSavedObjects;
  }

  // onSelectionChanged = selection => {
  //   const selectedSavedObjectIds = selection.map(item => item.id);
  //   this.setState({ selectedSavedObjectIds });
  //   // this.onDataCriteriaChange(this.state.criteria);
  // };

  changeTab = type => {
    this.setState({ activeType: type });
  }

  onSearchChanged = query => {
    this.setState({ activeQuery: query });
  }

  render() {
    const {
      savedObjects,
      activeType,
      activeQuery,
    } = this.state;

    const filteredSavedObjects = this.getFilteredSavedObjects();
    const tabConfig = TAB_CONFIG.map(tab => ({
      ...tab,
      count: savedObjects.filter(obj => obj.type === tab.id).length,
    }));

    const currentTab = tabConfig.find(tab => tab.id === activeType);

    return (
      <div>
        <Header/>
        <Tabs
          tabConfig={tabConfig}
          changeTab={this.changeTab}
          selectedTabId={activeType}
        />
        <EuiSpacer size="s"/>
        <Toolbar
          onSearchChanged={this.onSearchChanged}
          searchQuery={activeQuery}
        />
        <EuiHorizontalRule margin="s"/>
        { currentTab.count > 0 ?
          <Table
            items={filteredSavedObjects}
          />
          :
          <NoResults currentTab={currentTab}/>
        }
        <EuiSpacer size="xxl"/>
      </div>
    );
  }
}
