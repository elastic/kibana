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
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { DataTableFormat } from './data_table';
import { InspectorViewProps, Adapters } from '../../../types';
import {
  TabularLoaderOptions,
  TabularData,
  TabularCallback,
} from '../../../../common/adapters/data/types';
import { IUiSettingsClient } from '../../../../../../core/public';

interface DataViewComponentState {
  tabularData: TabularData | null;
  tabularOptions: TabularLoaderOptions;
  adapters: Adapters;
  tabularPromise: TabularCallback | null;
}

interface DataViewComponentProps extends InspectorViewProps {
  uiSettings: IUiSettingsClient;
}

export class DataViewComponent extends Component<DataViewComponentProps, DataViewComponentState> {
  static propTypes = {
    uiSettings: PropTypes.object.isRequired,
    adapters: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
  };

  state = {} as DataViewComponentState;
  _isMounted = false;

  static getDerivedStateFromProps(nextProps: InspectorViewProps, state: DataViewComponentState) {
    if (state && nextProps.adapters === state.adapters) {
      return null;
    }

    return {
      adapters: nextProps.adapters,
      tabularData: null,
      tabularOptions: {},
      tabularPromise: nextProps.adapters.data.getTabular(),
    };
  }

  onUpdateData = (type: string) => {
    if (type === 'tabular') {
      this.setState({
        tabularData: null,
        tabularOptions: {},
        tabularPromise: this.props.adapters.data.getTabular(),
      });
    }
  };

  async finishLoadingData() {
    const { tabularPromise } = this.state;

    if (tabularPromise) {
      const tabularData: TabularData = await tabularPromise;

      if (this._isMounted) {
        this.setState({
          tabularData: tabularData.data,
          tabularOptions: tabularData.options,
          tabularPromise: null,
        });
      }
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

  static renderNoData() {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="inspector.data.noDataAvailableTitle"
              defaultMessage="No data available"
            />
          </h2>
        }
        body={
          <React.Fragment>
            <p>
              <FormattedMessage
                id="inspector.data.noDataAvailableDescription"
                defaultMessage="The element did not provide any data."
              />
            </p>
          </React.Fragment>
        }
      />
    );
  }

  static renderLoading() {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiPanel className="eui-textCenter">
            <EuiLoadingChart size="m" />
            <EuiSpacer size="s" />
            <EuiText>
              <p>
                <FormattedMessage
                  id="inspector.data.gatheringDataLabel"
                  defaultMessage="Gathering data"
                />
              </p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    if (this.state.tabularPromise) {
      return DataViewComponent.renderLoading();
    } else if (!this.state.tabularData) {
      return DataViewComponent.renderNoData();
    }

    return (
      <DataTableFormat
        data={this.state.tabularData}
        isFormatted={this.state.tabularOptions.returnsFormattedValues}
        exportTitle={this.props.title}
        uiSettings={this.props.uiSettings}
      />
    );
  }
}
