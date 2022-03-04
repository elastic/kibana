/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { AggRow } from './agg_row';
import { MetricSelect } from './metric_select';
import { AggSelect } from './agg_select';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiComboBox,
  EuiFormLabel,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

const StandardSiblingAggUi = (props) => {
  const { siblings, intl, fields, indexPattern } = props;
  const defaults = { sigma: '' };
  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  const stdDev = {};
  if (model.type === 'std_deviation_bucket') {
    stdDev.sigma = (
      <EuiFlexItem grow={false}>
        <EuiFormRow
          id={htmlId('sigma')}
          label={
            <FormattedMessage id="visTypeTimeseries.stdSibling.sigmaLabel" defaultMessage="Sigma" />
          }
        >
          <EuiFieldText value={model.sigma} onChange={handleTextChange('sigma')} />
        </EuiFormRow>
      </EuiFlexItem>
    );

    const modeOptions = [
      {
        label: intl.formatMessage({
          id: 'visTypeTimeseries.stdSibling.modeOptions.rawLabel',
          defaultMessage: 'Raw',
        }),
        value: 'raw',
      },
      {
        label: intl.formatMessage({
          id: 'visTypeTimeseries.stdSibling.modeOptions.upperBoundLabel',
          defaultMessage: 'Upper Bound',
        }),
        value: 'upper',
      },
      {
        label: intl.formatMessage({
          id: 'visTypeTimeseries.stdSibling.modeOptions.lowerBoundLabel',
          defaultMessage: 'Lower Bound',
        }),
        value: 'lower',
      },
      {
        label: intl.formatMessage({
          id: 'visTypeTimeseries.stdSibling.modeOptions.boundsBandLabel',
          defaultMessage: 'Bounds Band',
        }),
        value: 'band',
      },
    ];
    const selectedModeOption = modeOptions.find((option) => {
      return model.mode === option.value;
    });

    stdDev.mode = (
      <EuiFlexItem>
        <EuiFormRow
          id={htmlId('mode')}
          label={
            <FormattedMessage id="visTypeTimeseries.stdSibling.modeLabel" defaultMessage="Mode" />
          }
        >
          <EuiComboBox
            options={modeOptions}
            selectedOptions={selectedModeOption ? [selectedModeOption] : []}
            onChange={handleSelectChange('mode')}
            singleSelection={{ asPlainText: true }}
          />
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
      dragHandleProps={props.dragHandleProps}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="visTypeTimeseries.stdSibling.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <AggSelect
            id={htmlId('aggregation')}
            panelType={props.panel.type}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('metric')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.stdSibling.metricLabel"
                defaultMessage="Metric"
              />
            }
          >
            <MetricSelect
              onChange={handleSelectChange('field')}
              exclude={[TSVB_METRIC_TYPES.PERCENTILE, TSVB_METRIC_TYPES.TOP_HIT]}
              metrics={siblings}
              fields={fields[getIndexPatternKey(indexPattern)]}
              metric={model}
              value={model.field}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {stdDev.sigma}
        {stdDev.mode}
      </EuiFlexGroup>
    </AggRow>
  );
};

StandardSiblingAggUi.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  indexPattern: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
  uiRestrictions: PropTypes.object,
  exclude: PropTypes.array,
};

export const StandardSiblingAgg = injectI18n(StandardSiblingAggUi);
