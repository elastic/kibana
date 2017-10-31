import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiTabs,
  KuiTab,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';

const ALL = 'all';

export class FeatureDirectory extends React.Component {

  constructor(props) {
    super(props);

    const tabs = [{
      id: ALL,
      name: 'All',
    }];
    if (props.directories.some(directory => directory.category === props.directoryCategories.DATA)) {
      tabs.push({
        id: props.directoryCategories.DATA,
        name: 'Explore & Visualize'
      });
    }
    if (props.directories.some(directory => directory.category === props.directoryCategories.ADMIN)) {
      tabs.push({
        id: props.directoryCategories.ADMIN,
        name: 'Administrative',
      });
    }
    if (props.directories.some(directory => directory.category === props.directoryCategories.OTHER)) {
      tabs.push({
        id: props.directoryCategories.OTHER,
        name: 'Other',
      });
    }

    this.tabs = tabs;
    this.state = {
      selectedTabId: ALL
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
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </KuiTab>
    ));
  }

  renderDirectories = () => {
    return this.props.directories.inTitleOrder
    .filter((directory) => {
      if (this.state.selectedTabId === ALL) {
        return true;
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
        <div className="kuiViewContent kuiViewContent--constrainedWidth">
          <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
            <h1 className="kuiTitle ">
              Feature Directory
            </h1>
          </div>
          <div className="kuiViewContentItem kuiVerticalRhythmXLarge">
            <KuiTabs className="featureDirectoryTabs">
              {this.renderTabs()}
            </KuiTabs>
            <KuiFlexGrid columns={4} className="featureDirectory">
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
  directories: PropTypes.object.isRequired
};
