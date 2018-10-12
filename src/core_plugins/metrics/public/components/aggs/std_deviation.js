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
import React from 'react';
import AggSelect from './agg_select';
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createTextHandler from '../lib/create_text_handler';
import {
  htmlIdGenerator,
  EuiComboBox,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

const StandardDeviationAggUi = props => {
  const { series, panel, fields, intl } = props;
  const defaults = { sigma: '' };
  const model = { ...defaults, ...props.model };

  const modeOptions = [
    {
      label: intl.formatMessage({ id: 'metrics.stdDeviation.modeOptions.rawLabel', defaultMessage: 'Raw' }),
      value: 'raw'
    },
    {
      label: intl.formatMessage({ id: 'metrics.stdDeviation.modeOptions.upperBoundLabel', defaultMessage: 'Upper Bound' }),
      value: 'upper'
    },
    {
      дabel: intl.formatMessage({ id: 'metrics.stdDeviation.modeOptions.lowerBoundLabel', defaultMessage: 'Lower Bound' }),
      value: 'lower'
    },
  ];

  if (panel.type !== 'table') {
    modeOptions.push({
      label: intl.formatMessage({ id: 'metrics.stdDeviation.modeOptions.boundsBandLabel', defaultMessage: 'Bounds Band' }),
      value: 'band'
    });
  }

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const htmlId = htmlIdGenerator();
  const selectedModeOption = modeOptions.find(option => {
    return model.mode === option.value;
  });

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <div className="vis_editor__row_item">
        <div className="vis_editor__label">
          <FormattedMessage
            id="metrics.stdDeviation.aggregationLabel"
            defaultMessage="Aggregation"
          />
        </div>
        <AggSelect
          panelType={props.panel.type}
          siblings={props.siblings}
          value={model.type}
          onChange={handleSelectChange('type')}
        />
      </div>
      <div className="vis_editor__std_deviation-field">
        <label className="vis_editor__label" htmlFor={htmlId('field')}>
          <FormattedMessage
            id="metrics.stdDeviation.fieldLabel"
            defaultMessage="Field"
          />
        </label>
        <FieldSelect
          id={htmlId('field')}
          fields={fields}
          type={model.type}
          restrict="numeric"
          indexPattern={indexPattern}
          value={model.field}
          onChange={handleSelectChange('field')}
        />
      </div>
      <div className="vis_editor__std_deviation-sigma_item">
        <label className="vis_editor__label" htmlFor={htmlId('sigma')}>
          <FormattedMessage
            id="metrics.stdDeviation.sigmaLabel"
            defaultMessage="Sigma"
          />
        </label>
        <input
          id={htmlId('sigma')}
          className="vis_editor__std_deviation-sigma"
          value={model.sigma}
          onChange={handleTextChange('sigma')}
        />
      </div>
      <div className="vis_editor__row_item">
        <label className="vis_editor__label" htmlFor={htmlId('mode')}>
          <FormattedMessage
            id="metrics.stdDeviation.modeLabel"
            defaultMessage="Mode"
          />
        </label>
        <EuiComboBox
          id={htmlId('mode')}
          options={modeOptions}
          selectedOptions={selectedModeOption ? [selectedModeOption] : []}
          onChange={handleSelectChange('mode')}
          singleSelection={true}
        />
      </div>
    </AggRow>
  );
};

StandardDeviationAggUi.propTypes = {
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

export const StandardDeviationAgg = injectI18n(StandardDeviationAggUi);
