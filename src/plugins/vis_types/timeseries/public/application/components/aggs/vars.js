/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { v1 as uuidv1 } from 'uuid';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { AddDeleteButtons } from '../add_delete_buttons';
import { collectionActions } from '../lib/collection_actions';
import { MetricSelect } from './metric_select';
import { EuiFlexGroup, EuiFlexItem, EuiFieldText } from '@elastic/eui';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

export const newVariable = (opts) => ({ id: uuidv1(), name: '', field: '', ...opts });

export class CalculationVars extends Component {
  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = _.get(e, '[0].value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const handleAdd = collectionActions.handleAdd.bind(null, this.props, newVariable);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, row);

    return (
      <EuiFlexItem key={row.id} data-test-subj="varRow">
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          <EuiFlexItem>
            <EuiFieldText
              className="tvbAggs__varName"
              aria-label={i18n.translate('visTypeTimeseries.vars.variableNameAriaLabel', {
                defaultMessage: 'Variable name',
              })}
              placeholder={i18n.translate('visTypeTimeseries.vars.variableNamePlaceholder', {
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
              fields={this.props.fields[getIndexPatternKey(this.props.indexPattern)]}
              includeSiblings={this.props.includeSiblings}
              exclude={this.props.exclude}
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

CalculationVars.defaultProps = {
  name: 'variables',
  includeSiblings: false,
};

CalculationVars.propTypes = {
  fields: PropTypes.object,
  indexPattern: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  metrics: PropTypes.array,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func,
  includeSiblings: PropTypes.bool,
};
