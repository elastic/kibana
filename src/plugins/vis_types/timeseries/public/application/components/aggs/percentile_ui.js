/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { TSVB_DEFAULT_COLOR } from '../../../../common/constants';
import { collectionActions } from '../lib/collection_actions';
import { AddDeleteButtons } from '../add_delete_buttons';
import uuid from 'uuid';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiFieldNumber,
  EuiFormRow,
  EuiFlexGrid,
  EuiPanel,
} from '@elastic/eui';
import { ColorPicker } from '../color_picker';
import { FormattedMessage } from '@kbn/i18n-react';

export const newPercentile = (opts) => {
  return _.assign({ id: uuid.v1(), mode: 'line', shade: 0.2, color: TSVB_DEFAULT_COLOR }, opts);
};

export class Percentiles extends Component {
  handleTextChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = _.get(e, '[0].value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  handleColorChange(item) {
    return (val) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(_.assign({}, item, val));
    };
  }

  renderRow = (row, i, items) => {
    const defaults = { value: '', percentile: '', shade: '', color: TSVB_DEFAULT_COLOR };
    const model = { ...defaults, ...row };
    const { panel, seriesId } = this.props;
    const flexItemStyle = { minWidth: 100 };
    const percentileSeries = panel.series.find((s) => s.id === seriesId) || panel.series[0];
    const isGroupedBy = panel.series.length > 0 && percentileSeries.split_mode !== 'everything';

    const percentileFieldNumber = (
      <EuiFlexItem style={flexItemStyle}>
        <EuiFormRow
          label={
            <FormattedMessage
              id="visTypeTimeseries.percentile.percentile"
              defaultMessage="Percentile"
            />
          }
        >
          <EuiFieldNumber
            aria-label={i18n.translate('visTypeTimeseries.percentile.percentileAriaLabel', {
              defaultMessage: 'Percentile',
            })}
            placeholder={0}
            max={100}
            min={0}
            step={1}
            onChange={this.handleTextChange(model, 'value')}
            value={model.value === '' ? '' : Number(model.value)}
          />
        </EuiFormRow>
      </EuiFlexItem>
    );

    if (panel.type === 'table') {
      return percentileFieldNumber;
    }

    const handleAdd = collectionActions.handleAdd.bind(null, this.props, newPercentile);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const modeOptions = [
      {
        label: i18n.translate('visTypeTimeseries.percentile.modeOptions.lineLabel', {
          defaultMessage: 'Line',
        }),
        value: 'line',
      },
      {
        label: i18n.translate('visTypeTimeseries.percentile.modeOptions.bandLabel', {
          defaultMessage: 'Band',
        }),
        value: 'band',
      },
    ];
    const optionsStyle = {
      ...flexItemStyle,
    };
    if (model.mode === 'line') {
      optionsStyle.display = 'none';
    }

    const htmlId = htmlIdGenerator(model.id);
    const selectedModeOption = modeOptions.find((option) => {
      return model.mode === option.value;
    });
    return (
      <EuiFlexItem key={model.id}>
        <EuiPanel>
          <EuiFlexGroup key={model.id} alignItems="center">
            <EuiFlexItem>
              <EuiFlexGrid columns={3}>
                {/* If the series is grouped by, then these colors are not respected,
                 no need to display the color picker */}
                {!isGroupedBy && !['table', 'metric', 'markdown'].includes(panel.type) && (
                  <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
                    <ColorPicker
                      disableTrash={true}
                      onChange={this.handleColorChange(model)}
                      value={model.color}
                      name="color"
                    />
                  </EuiFlexItem>
                )}
                {percentileFieldNumber}
                <EuiFlexItem style={flexItemStyle}>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.percentile.modeLabel"
                        defaultMessage="Mode:"
                      />
                    }
                  >
                    <EuiComboBox
                      isClearable={false}
                      id={htmlId('mode')}
                      options={modeOptions}
                      selectedOptions={selectedModeOption ? [selectedModeOption] : []}
                      onChange={this.handleTextChange(model, 'mode')}
                      singleSelection={{ asPlainText: true }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={optionsStyle}>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.percentile.fillToLabel"
                        defaultMessage="Fill to:"
                      />
                    }
                  >
                    <EuiFieldNumber
                      id={htmlId('fillTo')}
                      min={0}
                      max={100}
                      step={1}
                      onChange={this.handleTextChange(model, 'percentile')}
                      value={Number(model.percentile)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem style={optionsStyle}>
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="visTypeTimeseries.percentile.shadeLabel"
                        defaultMessage="Shade (0 to 1):"
                      />
                    }
                  >
                    <EuiFieldNumber
                      id={htmlId('shade')}
                      step={0.1}
                      onChange={this.handleTextChange(model, 'shade')}
                      value={Number(model.shade)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGrid>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AddDeleteButtons
                onAdd={handleAdd}
                onDelete={handleDelete}
                disableDelete={items.length < 2}
                responsive={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    );
  };

  render() {
    const { model, name, panel } = this.props;
    if (!model[name]) return <div />;
    let rows;
    if (panel.type === 'table') {
      rows = this.renderRow(_.last(model[name]));
    } else {
      rows = model[name].map(this.renderRow);
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        {rows}
      </EuiFlexGroup>
    );
  }
}

Percentiles.defaultProps = {
  name: 'percentile',
};

Percentiles.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  panel: PropTypes.object,
  onChange: PropTypes.func,
  seriesId: PropTypes.string,
};
