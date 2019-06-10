/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { InspectorView } from 'ui/inspector';

import {
  DataTableFormat,
} from './data_table';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

class DataViewComponent extends Component {

  _isMounted = false;
  state = {
    tabularData: null,
    tabularOptions: {},
    tabularLoader: null,
  }

  static getDerivedStateFromProps(nextProps, state) {
    if (nextProps.adapters === state.adapters) {
      return null;
    }

    return {
      adapters: nextProps.adapters,
      tabularData: null,
      tabularOptions: {},
      tabularPromise: nextProps.adapters.data.getTabular(),
    };
  }

  onUpdateData = (type) => {
    if (type === 'tabular') {
      this.setState({
        tabularData: null,
        tabularOptions: {},
        tabularPromise: this.props.adapters.data.getTabular(),
      });
    }
  };

  finishLoadingData() {
    if (this.state.tabularPromise) {
      this.state.tabularPromise.then(({ data, options }) => {
        // Only update the data if the promise resolved before unmounting the component
        if (this._isMounted) {
          this.setState({
            tabularData: data,
            tabularOptions: options,
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
          title={
            <h2>
              <FormattedMessage
                id="inspectorViews.data.noDataAvailableTitle"
                defaultMessage="No data available"
              />
            </h2>
          }
          body={
            <React.Fragment>
              <p>
                <FormattedMessage
                  id="inspectorViews.data.noDataAvailableDescription"
                  defaultMessage="The element did not provide any data."
                />
              </p>
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
            <EuiPanel className="eui-textCenter">
              <EuiLoadingChart size="m" />
              <EuiSpacer size="s" />
              <EuiText>
                <p>
                  <FormattedMessage
                    id="inspectorViews.data.gatheringDataLabel"
                    defaultMessage="Gathering data"
                  />
                </p>
              </EuiText>
            </EuiPanel>
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
          isFormatted={this.state.tabularOptions.returnsFormattedValues}
          exportTitle={this.props.title}
        />
      </InspectorView>
    );
  }
}

const DataView = {
  title: i18n.translate('inspectorViews.data.dataTitle', {
    defaultMessage: 'Data'
  }),
  order: 10,
  help: i18n.translate('inspectorViews.data.dataDescriptionTooltip', {
    defaultMessage: 'View the data behind the visualization'
  }),
  shouldShow(adapters) {
    return Boolean(adapters.data);
  },
  component: DataViewComponent
};

export { DataView };
