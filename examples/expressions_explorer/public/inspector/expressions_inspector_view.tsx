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
import { InspectorViewProps, Adapters } from '../../../../src/plugins/inspector/public';
import { AstDebugView } from './ast_debug_view';

interface ExpressionsInspectorViewComponentState {
  ast: any;
  adapters: Adapters;
}

class ExpressionsInspectorViewComponent extends Component<
  InspectorViewProps,
  ExpressionsInspectorViewComponentState
> {
  static propTypes = {
    adapters: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
  };

  state = {} as ExpressionsInspectorViewComponentState;

  static getDerivedStateFromProps(
    nextProps: Readonly<InspectorViewProps>,
    state: ExpressionsInspectorViewComponentState
  ) {
    if (state && nextProps.adapters === state.adapters) {
      return null;
    }

    const { ast } = nextProps.adapters.expression;

    return {
      adapters: nextProps.adapters,
      ast,
    };
  }

  onUpdateData = (ast: any) => {
    this.setState({
      ast,
    });
  };

  componentDidMount() {
    this.props.adapters.expression!.on('change', this.onUpdateData);
  }

  componentWillUnmount() {
    this.props.adapters.expression!.removeListener('change', this.onUpdateData);
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
    if (!this.state.ast) {
      return ExpressionsInspectorViewComponent.renderNoData();
    }

    return <AstDebugView ast={this.state.ast} />;
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export default ExpressionsInspectorViewComponent;
