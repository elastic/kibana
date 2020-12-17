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
import { EuiEmptyPrompt } from '@elastic/eui';

import { DataTableFormat } from './data_table';
import { IUiSettingsClient } from '../../../../../../core/public';
import { InspectorViewProps, Adapters } from '../../../../../inspector/public';
import { UiActionsStart } from '../../../../../ui_actions/public';
import { FieldFormatsStart } from '../../../field_formats';
import { TablesAdapter, Datatable, DatatableColumn } from '../../../../../expressions/public';

interface DataViewComponentState {
  datatable: Datatable;
  adapters: Adapters;
}

interface DataViewComponentProps extends InspectorViewProps {
  uiSettings: IUiSettingsClient;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  isFilterable: (column: DatatableColumn) => boolean;
  options: { fileName?: string };
}

class DataViewComponent extends Component<DataViewComponentProps, DataViewComponentState> {
  static propTypes = {
    adapters: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
    uiSettings: PropTypes.object,
    uiActions: PropTypes.object.isRequired,
    fieldFormats: PropTypes.object.isRequired,
    isFilterable: PropTypes.func.isRequired,
  };

  state = {} as DataViewComponentState;

  static getDerivedStateFromProps(
    nextProps: Readonly<DataViewComponentProps>,
    state: DataViewComponentState
  ) {
    if (state && nextProps.adapters === state.adapters) {
      return null;
    }

    const { tables } = nextProps.adapters.tables;
    const keys = Object.keys(tables);
    const datatable = keys.length ? tables[keys[0]] : undefined;

    return {
      adapters: nextProps.adapters,
      datatable,
    };
  }

  onUpdateData = (tables: TablesAdapter['tables']) => {
    const keys = Object.keys(tables);
    const datatable = keys.length ? tables[keys[0]] : undefined;

    if (datatable) {
      this.setState({
        datatable,
      });
    }
  };

  componentDidMount() {
    this.props.adapters.tables!.on('change', this.onUpdateData);
  }

  componentWillUnmount() {
    this.props.adapters.tables!.removeListener('change', this.onUpdateData);
  }

  static renderNoData() {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="data.inspector.table.noDataAvailableTitle"
              defaultMessage="No data available"
            />
          </h2>
        }
        body={
          <React.Fragment>
            <p>
              <FormattedMessage
                id="data.inspector.table.noDataAvailableDescription"
                defaultMessage="The element did not provide any data."
              />
            </p>
          </React.Fragment>
        }
      />
    );
  }

  render() {
    if (!this.state.datatable) {
      return DataViewComponent.renderNoData();
    }

    return (
      <DataTableFormat
        data={this.state.datatable}
        exportTitle={this.props.options?.fileName || this.props.title}
        uiSettings={this.props.uiSettings}
        fieldFormats={this.props.fieldFormats}
        uiActions={this.props.uiActions}
        isFilterable={this.props.isFilterable}
      />
    );
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default DataViewComponent;
