/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
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
