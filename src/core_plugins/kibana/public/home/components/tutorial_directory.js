import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import {
  KuiTabs,
  KuiTab,
  KuiFlexItem,
  KuiFlexGrid,
} from 'ui_framework/components';

export class TutorialDirectory extends React.Component {

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

  renderTutorials = () => {
    return this.props.tutorials.inNameOrder
    .map((tutorial) => {
      return (
        <KuiFlexItem key={tutorial.name}>
          <Synopsis
            description={tutorial.shortDescription}
            title={tutorial.name}
            url={this.props.addBasePath(`#/home/tutorial/${tutorial.id}`)}
          />
        </KuiFlexItem>
      );
    });
  };

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
          <KuiFlexGrid columns={4}>

            <KuiFlexItem>
              <Synopsis
                description="Is your data already in Elastic Search? Set up an Index Pattern to quickly query it."
                title="Set up an Index Pattern"
                url={this.props.addBasePath('/app/kibana#/management/kibana/index')}
              />
            </KuiFlexItem>

            { this.renderTutorials() }

          </KuiFlexGrid>
        </div>
      </div>
    );
  }
}

TutorialDirectory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  tutorials: PropTypes.object.isRequired
};
