import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  EuiTabs,
  EuiTab,
  EuiFlexItem,
  EuiFlexGrid,
  EuiPage,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

const ALL_TAB_ID = 'all';
const OTHERS_TAB_ID = 'others';

const isOtherCategory = (directory) => {
  return directory.category !== FeatureCatalogueCategory.DATA && directory.category !== FeatureCatalogueCategory.ADMIN;
};

export class FeatureDirectory extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: ALL_TAB_ID,
      name: 'All',
    }, {
      id: FeatureCatalogueCategory.DATA,
      name: 'Data Exploration & Visualization',
    }, {
      id: FeatureCatalogueCategory.ADMIN,
      name: 'Administrative',
    }];
    if (props.directories.some(isOtherCategory)) {
      this.tabs.push({
        id: OTHERS_TAB_ID,
        name: 'Other',
      });
    }

    this.state = {
      selectedTabId: ALL_TAB_ID
    };
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab, index) => (
      <EuiTab
        className="homeDirectoryTab"
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  renderDirectories = () => {
    return this.props.directories
      .filter((directory) => {
        if (this.state.selectedTabId === ALL_TAB_ID) {
          return true;
        }
        if (this.state.selectedTabId === OTHERS_TAB_ID) {
          return isOtherCategory(directory);
        }
        return this.state.selectedTabId === directory.category;
      })
      .map((directory) => {
        return (
          <EuiFlexItem key={directory.id}>
            <Synopsis
              description={directory.description}
              iconUrl={this.props.addBasePath(directory.icon)}
              title={directory.title}
              url={this.props.addBasePath(directory.path)}
              wrapInPanel
            />
          </EuiFlexItem>
        );
      });
  };

  render() {
    return (
      <EuiPage className="home">
        <EuiTitle size="l">
          <h1>
            Directory
          </h1>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiTabs className="homeDirectoryTabs">
          {this.renderTabs()}
        </EuiTabs>
        <EuiSpacer />
        <EuiFlexGrid columns={4}>
          { this.renderDirectories() }
        </EuiFlexGrid>
      </EuiPage>
    );
  }
}

FeatureDirectory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    showOnHomePage: PropTypes.bool.isRequired,
    category: PropTypes.string.isRequired
  }))
};
