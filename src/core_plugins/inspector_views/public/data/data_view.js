import React, { Component } from 'react';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
} from '@elastic/eui';

import { InspectorView } from 'ui/inspector';

import {
  DataTableFormat,
} from './data_table';

class DataViewComponent extends Component {

  _isMounted = false;
  state = {
    tabularData: null,
    tabularLoader: null,
  }

  static getDerivedStateFromProps(nextProps) {
    return {
      tabularData: null,
      tabularPromise: nextProps.adapters.data.getTabular(),
    };
  }

  onUpdateData = (type) => {
    if (type === 'tabular') {
      this.setState({
        tabularData: null,
        tabularPromise: this.props.adapters.data.getTabular(),
      });
    }
  };

  finishLoadingData() {
    if (this.state.tabularPromise) {
      this.state.tabularPromise.then((data) => {
        // Only update the data if the promise resolved before unmounting the component
        if (this._isMounted) {
          this.setState({
            tabularData: data,
            tabularPromise: null,
          });
        }
      });
    }
  }

  componentDidMount() {
    this._isMounted = true;
    this.props.adapters.data.on('change', this.onUpdateData);
    this.finishLoadingData();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.props.adapters.data.removeListener('change', this.onUpdateData);
  }

  componentDidUpdate() {
    this.finishLoadingData();
  }

  renderNoData() {
    return (
      <InspectorView useFlex={true}>
        <EuiEmptyPrompt
          title={<h2>No data available</h2>}
          body={
            <React.Fragment>
              <p>The element did not provide any data.</p>
            </React.Fragment>
          }
        />
      </InspectorView>
    );
  }

  renderLoading() {
    return (
      <InspectorView useFlex={true}>
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            Gathering data &hellip;
          </EuiFlexItem>
        </EuiFlexGroup>
      </InspectorView>
    );
  }

  render() {
    if (this.state.tabularPromise) {
      return this.renderLoading();
    } else if (!this.state.tabularData) {
      return this.renderNoData();
    }

    return (
      <InspectorView>
        <DataTableFormat
          data={this.state.tabularData}
          exportTitle={this.props.title}
        />
      </InspectorView>
    );
  }
}

const DataView = {
  title: 'Data',
  order: 10,
  help: `The data inspector shows the data that is used to draw the visualization.`,
  shouldShow(adapters) {
    return adapters.data;
  },
  component: DataViewComponent
};

export { DataView };
