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
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import * as collectionActions from '../lib/collection_actions';
import AddDeleteButtons from '../add_delete_buttons';
import uuid from 'uuid';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import {
  htmlIdGenerator,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiFieldNumber,
  EuiFormRow,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { ES_TYPES } from '../../../common/es_types';

const newPercentile = (opts) => {
  return _.assign({ id: uuid.v1(), mode: 'line', shade: 0.2 }, opts);
};

const RESTRICT_FIELDS = [ES_TYPES.NUMBER];

class PercentilesUi extends Component {

  handleTextChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = _.get(e, '[0].value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow = (row, i, items) => {
    const defaults = { value: '', percentile: '', shade: '' };
    const model = { ...defaults, ...row };
    const { intl, panel } = this.props;

    const percentileFieldNumber = (
      <EuiFlexItem grow={false}>
        <EuiFieldNumber
          aria-label={intl.formatMessage({ id: 'tsvb.percentile.percentileAriaLabel', defaultMessage: 'Percentile' })}
          placeholder={0}
          max={100}
          min={0}
          step={1}
          onChange={this.handleTextChange(model, 'value')}
          value={model.value === '' ? '' : Number(model.value)}
        />
      </EuiFlexItem>
    );

    if (panel.type === 'table') {
      return percentileFieldNumber;
    }

    const handleAdd = collectionActions.handleAdd.bind(null, this.props, newPercentile);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const modeOptions = [
      {
        label: intl.formatMessage({ id: 'tsvb.percentile.modeOptions.lineLabel', defaultMessage: 'Line' }),
        value: 'line'
      },
      {
        label: intl.formatMessage({ id: 'tsvb.percentile.modeOptions.bandLabel', defaultMessage: 'Band' }),
        value: 'band'
      }
    ];
    const optionsStyle = {};
    if (model.mode === 'line') {
      optionsStyle.display = 'none';
    }
    const labelStyle = { marginBottom: 0 };
    const htmlId = htmlIdGenerator(model.id);
    const selectedModeOption = modeOptions.find(option => {
      return model.mode === option.value;
    });
    return  (
      <EuiFlexItem key={model.id}>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">

          { percentileFieldNumber }

          <EuiFlexItem grow={false}>
            <EuiFormLabel style={labelStyle} htmlFor={htmlId('mode')}>
              <FormattedMessage
                id="tsvb.percentile.modeLabel"
                defaultMessage="Mode:"
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiComboBox
              isClearable={false}
              id={htmlId('mode')}
              options={modeOptions}
              selectedOptions={selectedModeOption ? [selectedModeOption] : []}
              onChange={this.handleTextChange(model, 'mode')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFlexItem>

          <EuiFlexItem style={optionsStyle} grow={false}>
            <EuiFormLabel style={labelStyle} htmlFor={htmlId('fillTo')}>
              <FormattedMessage
                id="tsvb.percentile.fillToLabel"
                defaultMessage="Fill to:"
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem style={optionsStyle} grow={false}>
            <EuiFieldNumber
              id={htmlId('fillTo')}
              step={1}
              onChange={this.handleTextChange(model, 'percentile')}
              value={Number(model.percentile)}
            />
          </EuiFlexItem>

          <EuiFlexItem style={optionsStyle} grow={false}>
            <EuiFormLabel style={labelStyle} htmlFor={htmlId('shade')}>
              <FormattedMessage
                id="tsvb.percentile.shadeLabel"
                defaultMessage="Shade (0 to 1):"
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem style={optionsStyle} grow={false}>
            <EuiFieldNumber
              id={htmlId('shade')}
              style={optionsStyle}
              step={0.1}
              onChange={this.handleTextChange(model, 'shade')}
              value={Number(model.shade)}
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
    const { model, name, panel } = this.props;
    if (!model[name]) return (<div/>);
    let rows;
    if (panel.type === 'table') {
      rows = this.renderRow(_.last(model[name]));
    } else {
      rows = model[name].map(this.renderRow);
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        { rows }
      </EuiFlexGroup>
    );
  }
}

PercentilesUi.defaultProps = {
  name: 'percentile'
};

PercentilesUi.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  panel: PropTypes.object,
  onChange: PropTypes.func
};

const Percentiles = injectI18n(PercentilesUi);

class PercentileAgg extends Component { // eslint-disable-line react/no-multi-comp

  componentWillMount() {
    if (!this.props.model.percentiles) {
      this.props.onChange(_.assign({}, this.props.model, {
        percentiles: [newPercentile({ value: 50 })]
      }));
    }
  }

  render() {
    const { series, model, panel, fields } = this.props;

    const handleChange = createChangeHandler(this.props.onChange, model);
    const handleSelectChange = createSelectHandler(handleChange);
    const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
    const htmlId = htmlIdGenerator();

    return (
      <AggRow
        disableDelete={this.props.disableDelete}
        model={this.props.model}
        onAdd={this.props.onAdd}
        onDelete={this.props.onDelete}
        siblings={this.props.siblings}
        dragHandleProps={this.props.dragHandleProps}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormLabel htmlFor={htmlId('aggregation')}>
              <FormattedMessage
                id="tsvb.percentile.aggregationLabel"
                defaultMessage="Aggregation"
              />
            </EuiFormLabel>
            <AggSelect
              id={htmlId('aggregation')}
              panelType={this.props.panel.type}
              siblings={this.props.siblings}
              value={model.type}
              onChange={handleSelectChange('type')}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('field')}
              label={(<FormattedMessage
                id="tsvb.percentile.fieldLabel"
                defaultMessage="Field"
              />)}
            >
              <FieldSelect
                fields={fields}
                type={model.type}
                restrict={RESTRICT_FIELDS}
                indexPattern={indexPattern}
                value={model.field}
                onChange={handleSelectChange('field')}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <Percentiles
          onChange={handleChange}
          name="percentiles"
          model={model}
          panel={panel}
        />

      </AggRow>
    );
  }

}

PercentileAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};

export default PercentileAgg;
