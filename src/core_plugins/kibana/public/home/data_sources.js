import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiTabs,
  KuiTab,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';

export class DataSources extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: 'all',
      name: 'All',
    }, {
      id: 'logging',
      name: 'Logging',
    }, {
      id: 'metrics',
      name: 'Merics',
    }, {
      id: 'security',
      name: 'Security analytics',
    }];

    this.state = {
      selectedTabId: 'all'
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

  render() {
    return (
      <div className="kuiView">
        <div className="kuiViewContent kuiViewContent--constrainedWidth">
          <a className="kuiLink" href="#/home">Home</a> / Integrations
          <h2 className="kuiTitle">
            Integrations
          </h2>
          <KuiTabs>
            {this.renderTabs()}
          </KuiTabs>
        </div>
      </div>
    );
  }
}

DataSources.propTypes = {
  addBasePath: PropTypes.func.isRequired
};
