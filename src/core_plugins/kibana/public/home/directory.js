import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiTabs,
  KuiTab,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';

const allCategories = 'all';

export class Directory extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: allCategories,
      name: 'All',
    }, {
      id: props.directoryCategories.DATA,
      name: 'Explore & Visualize',
    }, {
      id: props.directoryCategories.ADMIN,
      name: 'Administrative',
    }, {
      id: props.directoryCategories.OTHER,
      name: 'Other',
    }];

    this.state = {
      selectedTabId: allCategories
    };
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab,index) => (
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
      if (this.state.selectedTabId === allCategories) {
        return true;
      }
      return this.state.selectedTabId === directory.category;
    })
    .map((directory) => {
      return (
        <KuiFlexItem>
          <Synopsis
            key={directory.id}
            description={directory.description}
            title={directory.title}
            url={this.props.addBasePath(directory.path)}
          />
        </KuiFlexItem>
      );
    });
  };

  render() {
    return (
      <div className="kuiView">
        <div className="kuiViewContent kuiViewContent--constrainedWidth">
          <a className="kuiLink" href="#/home">Home</a> / Directory
          <h2 className="kuiTitle">
            Directory
          </h2>
          <KuiTabs>
            {this.renderTabs()}
          </KuiTabs>
          <KuiFlexGrid columns={4}>
            { this.renderDirectories() }
          </KuiFlexGrid>
        </div>
      </div>
    );
  }
}

Directory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired
};
