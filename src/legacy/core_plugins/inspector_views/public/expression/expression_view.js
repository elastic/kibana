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
import {
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';

import { InspectorView } from 'ui/inspector';

class ExpressionViewComponent extends Component {

  constructor(props) {
    super(props);
    props.adapters.expression.on('change', this._onExpressionChange);

    const expression = props.adapters.expression.getExpression();
    this.state = {
      expression
    };
  }

  _onExpressionChange = () => {
    const expression = this.props.adapters.expression.getExpression();
    this.setState({ expression });
  }

  componentWillUnmount() {
    this.props.adapters.expression.removeListener('change', this._onRequestsChange);
  }

  renderEmptyExpression() {
    return (
      <InspectorView useFlex={true}>
        <EuiEmptyPrompt
          data-test-subj="inspectorNoExpressionMessage"
          title={<h2>No expression logged</h2>}
          body={
            <React.Fragment>
              <p>The element hasn&apos;t logged expression (yet).</p>
            </React.Fragment>
          }
        />
      </InspectorView>
    );
  }

  render() {
    if (!this.state.expression) {
      return this.renderEmptyExpression();
    }

    return (
      <InspectorView>
        <EuiText size="xs">
          <p>{this.state.expression}</p>
        </EuiText>
      </InspectorView>
    );
  }
}

ExpressionViewComponent.propTypes = {
  adapters: PropTypes.object.isRequired,
};

const ExpressionView = {
  title: 'Expression',
  order: 20,
  help: `View the expression that was executed`,
  shouldShow(adapters) {
    return Boolean(adapters.expression);
  },
  component: ExpressionViewComponent
};

export { ExpressionView };
