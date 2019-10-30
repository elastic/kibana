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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import { AddDeleteButtons } from '../add_delete_buttons';
import { collectionActions } from '../lib/collection_actions';
import { MetricSelect } from './metric_select';
import { EuiFlexGroup, EuiFlexItem, EuiFieldText } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

class CalculationVarsUi extends Component {
  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return e => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = _.get(e, '[0].value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const handleAdd = collectionActions.handleAdd.bind(null, this.props);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, row);
    const { intl } = this.props;
    return (
      <EuiFlexItem key={row.id} data-test-subj="varRow">
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          <EuiFlexItem>
            <EuiFieldText
              className="tvbAggs__varName"
              aria-label={intl.formatMessage({
                id: 'visTypeTimeseries.vars.variableNameAriaLabel',
                defaultMessage: 'Variable name',
              })}
              placeholder={intl.formatMessage({
                id: 'visTypeTimeseries.vars.variableNamePlaceholder',
                defaultMessage: 'Variable name',
              })}
              onChange={this.handleChange(row, 'name')}
              value={row.name}
            />
          </EuiFlexItem>
          <EuiFlexItem className="tvbAggs__varMetricWrapper">
            <MetricSelect
              onChange={this.handleChange(row, 'field')}
              metrics={this.props.metrics}
              metric={this.props.model}
              value={row.field}
              includeSiblings={this.props.includeSiblings}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <AddDeleteButtons
              onAdd={handleAdd}
              onDelete={handleDelete}
              disableDelete={items.length < 2}
              responsive={false}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  render() {
    const { model, name } = this.props;
    if (!model[name]) return <div />;
    const rows = model[name].map(this.renderRow);
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        {rows}
      </EuiFlexGroup>
    );
  }
}

CalculationVarsUi.defaultProps = {
  name: 'variables',
  includeSiblings: false,
};

CalculationVarsUi.propTypes = {
  metrics: PropTypes.array,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func,
  includeSiblings: PropTypes.bool,
};

export const CalculationVars = injectI18n(CalculationVarsUi);
