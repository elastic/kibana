import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiTabs,
  KuiTab
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
        <div key={directory.id}>
          <a href={this.props.addBasePath(directory.path)}>
            {directory.title}
          </a>
          {directory.description}
        </div>
      );
    });
  };

  render() {
    return (
      <div>
        <a className="kuiLink" href="#/home">Home</a> / Directory
        <h2 className="kuiTitle">
          Directory
        </h2>
        <KuiTabs>
          {this.renderTabs()}
        </KuiTabs>
        { this.renderDirectories() }
      </div>
    );
  }
}

Directory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  directories: PropTypes.object.isRequired,
  directoryCategories: PropTypes.object.isRequired
};
