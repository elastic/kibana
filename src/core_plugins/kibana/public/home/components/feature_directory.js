import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiTabs,
  KuiTab,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';
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
      <KuiTab
        className="homeFeatureCategoryTab"
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </KuiTab>
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
          <KuiFlexItem key={directory.id}>
            <Synopsis
              description={directory.description}
              iconUrl={this.props.addBasePath(directory.icon)}
              title={directory.title}
              url={this.props.addBasePath(directory.path)}
            />
          </KuiFlexItem>
        );
      });
  };

  render() {
    return (
      <div className="kuiView home">
        <div className="kuiViewContent">
          <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
            <h1 className="kuiTitle ">
              Directory
            </h1>
          </div>
          <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
            <KuiTabs className="homeFeatureDirectoryTabs">
              {this.renderTabs()}
            </KuiTabs>
            <KuiFlexGrid columns={4} className="homeFeatureDirectory">
              { this.renderDirectories() }
            </KuiFlexGrid>
          </div>
        </div>
      </div>
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
