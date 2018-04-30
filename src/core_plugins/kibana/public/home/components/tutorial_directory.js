import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Synopsis } from './synopsis';
import { SampleDataSetCard } from './sample_data_set_card';

import {
  EuiPage,
  EuiTabs,
  EuiTab,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';


import { getTutorials } from '../load_tutorials';
import { listSampleDataSets } from '../sample_data_sets';

const ALL_TAB_ID = 'all';
const SAMPLE_DATA_TAB_ID = 'sampleData';

export class TutorialDirectory extends React.Component {

  constructor(props) {
    super(props);

    this.tabs = [{
      id: ALL_TAB_ID,
      name: 'All',
    }, {
      id: 'logging',
      name: 'Logging',
    }, {
      id: 'metrics',
      name: 'Metrics',
    }, {
      id: 'security',
      name: 'Security Analytics',
    }, {
      id: SAMPLE_DATA_TAB_ID,
      name: 'Sample Data',
    }];

    let openTab = ALL_TAB_ID;
    if (props.openTab && this.tabs.some(tab => { return tab.id === props.openTab; })) {
      openTab = props.openTab;
    }
    this.state = {
      selectedTabId: openTab,
      tutorials: [],
      sampleDataSets: [],
    };
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    this.loadSampleDataSets();

    let tutorials = await getTutorials();
    if (this.props.isCloudEnabled) {
      tutorials = tutorials.filter(tutorial => {
        return _.has(tutorial, 'elasticCloud');
      });
    }
    tutorials.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    if (!this._isMounted) {
      return;
    }

    this.setState({ // eslint-disable-line react/no-did-mount-set-state
      tutorials: tutorials,
    });
  }

  loadSampleDataSets = async () => {
    const sampleDataSets = await listSampleDataSets();
    sampleDataSets.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    if (!this._isMounted) {
      return;
    }

    this.setState({
      sampleDataSets: sampleDataSets,
    });
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

  renderTab = () => {
    if (this.state.selectedTabId === SAMPLE_DATA_TAB_ID) {
      return this.renderSampleDataSetsTab();
    }

    return this.renderTutorialsTab();
  }

  renderTutorialsTab = () => {
    return this.state.tutorials
      .filter((tutorial) => {
        if (this.state.selectedTabId === ALL_TAB_ID) {
          return true;
        }
        return this.state.selectedTabId === tutorial.category;
      })
      .map((tutorial) => {
        return (
          <EuiFlexItem key={tutorial.name}>
            <Synopsis
              iconType={tutorial.euiIconType}
              description={tutorial.shortDescription}
              title={tutorial.name}
              wrapInPanel
              url={this.props.addBasePath(`#/home/tutorial/${tutorial.id}`)}
            />
          </EuiFlexItem>
        );
      });
  };

  renderSampleDataSetsTab = () => {
    return this.state.sampleDataSets.map(sampleDataSet => {
      return (
        <EuiFlexItem key={sampleDataSet.id}>
          <SampleDataSetCard
            id={sampleDataSet.id}
            description={sampleDataSet.description}
            name={sampleDataSet.name}
            launchUrl={this.props.addBasePath(`/app/kibana#/dashboard/${sampleDataSet.overviewDashboard}`)}
            isInstalled={sampleDataSet.isInstalled}
            onRequestComplete={this.loadSampleDataSets}
          />
        </EuiFlexItem>
      );
    });
  }

  render() {
    return (
      <EuiPage className="home">

        <a className="kuiLink" href="#/home">Home</a>
        <EuiSpacer size="s" />
        <EuiTitle size="l">
          <h1>
            Add Data to Kibana
          </h1>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiTabs>
          {this.renderTabs()}
        </EuiTabs>
        <EuiSpacer />
        <EuiFlexGrid columns={4}>
          { this.renderTab() }
        </EuiFlexGrid>

      </EuiPage>
    );
  }
}

TutorialDirectory.propTypes = {
  addBasePath: PropTypes.func.isRequired,
  openTab: PropTypes.string,
  isCloudEnabled: PropTypes.bool.isRequired,
};
