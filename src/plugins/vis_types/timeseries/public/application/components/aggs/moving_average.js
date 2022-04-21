/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Fragment, useCallback, useState } from 'react';
import { AggRow } from './agg_row';
import { AggSelect } from './agg_select';
import { MetricSelect } from './metric_select';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createNumberHandler } from '../lib/create_number_handler';
import { TSVB_METRIC_TYPES, MODEL_TYPES } from '../../../../common/enums';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiComboBox,
  EuiSpacer,
  EuiFormRow,
  EuiFieldNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

const DEFAULTS = {
  model_type: MODEL_TYPES.UNWEIGHTED,
  alpha: 0.3,
  beta: 0.1,
  gamma: 0.3,
  period: 1,
  multiplicative: true,
  window: 5,
};

const shouldShowHint = ({ model_type: type, window, period }) =>
  type === MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE && period * 2 > window;

export const MovingAverageAgg = (props) => {
  const { siblings, fields, indexPattern } = props;
  const [model, setModel] = useState({ ...DEFAULTS, ...props.model });
  const onModelChange = useCallback(
    (newModel) => {
      props.onChange(newModel);
      setModel(newModel);
    },
    [props]
  );

  const modelOptions = [
    {
      label: i18n.translate('visTypeTimeseries.movingAverage.modelOptions.simpleLabel', {
        defaultMessage: 'Simple',
      }),
      value: MODEL_TYPES.UNWEIGHTED,
    },
    {
      label: i18n.translate('visTypeTimeseries.movingAverage.modelOptions.linearLabel', {
        defaultMessage: 'Linear',
      }),
      value: MODEL_TYPES.WEIGHTED_LINEAR,
    },
    {
      label: i18n.translate(
        'visTypeTimeseries.movingAverage.modelOptions.exponentiallyWeightedLabel',
        {
          defaultMessage: 'Exponentially Weighted',
        }
      ),
      value: MODEL_TYPES.WEIGHTED_EXPONENTIAL,
    },
    {
      label: i18n.translate('visTypeTimeseries.movingAverage.modelOptions.holtLinearLabel', {
        defaultMessage: 'Holt-Linear',
      }),
      value: MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE,
    },
    {
      label: i18n.translate('visTypeTimeseries.movingAverage.modelOptions.holtWintersLabel', {
        defaultMessage: 'Holt-Winters',
      }),
      value: MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE,
    },
  ];

  const handleChange = createChangeHandler(onModelChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);

  const htmlId = htmlIdGenerator();
  const selectedModelOption = modelOptions.find(({ value }) => model.model_type === value);

  const multiplicativeOptions = [
    {
      label: i18n.translate('visTypeTimeseries.movingAverage.multiplicativeOptions.true', {
        defaultMessage: 'True',
      }),
      value: true,
    },
    {
      label: i18n.translate('visTypeTimeseries.movingAverage.multiplicativeOptions.false', {
        defaultMessage: 'False',
      }),
      value: false,
    },
  ];
  const selectedMultiplicative = multiplicativeOptions.find(
    ({ value }) => model.multiplicative === value
  );

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
            {i18n.translate('visTypeTimeseries.movingAverage.aggregationLabel', {
              defaultMessage: 'Aggregation',
            })}
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
            label={i18n.translate('visTypeTimeseries.movingAverage.metricLabel', {
              defaultMessage: 'Metric',
            })}
          >
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              fields={fields[getIndexPatternKey(indexPattern)]}
              value={model.field}
              exclude={[TSVB_METRIC_TYPES.TOP_HIT]}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('model_type')}
            label={i18n.translate('visTypeTimeseries.movingAverage.modelLabel', {
              defaultMessage: 'Model',
            })}
          >
            <EuiComboBox
              isClearable={false}
              placeholder={i18n.translate(
                'visTypeTimeseries.movingAverage.model.selectPlaceholder',
                {
                  defaultMessage: 'Select',
                }
              )}
              options={modelOptions}
              selectedOptions={selectedModelOption ? [selectedModelOption] : []}
              onChange={handleSelectChange('model_type')}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('windowSize')}
            label={i18n.translate('visTypeTimeseries.movingAverage.windowSizeLabel', {
              defaultMessage: 'Window Size',
            })}
            helpText={
              shouldShowHint(model) &&
              i18n.translate('visTypeTimeseries.movingAverage.windowSizeHint', {
                defaultMessage: 'Window must always be at least twice the size of your period',
              })
            }
          >
            <EuiFieldNumber
              className="tvbAgg__input"
              onChange={handleNumberChange('window', { isClearable: true })}
              value={model.window}
              min={1}
              isInvalid={!model.window}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {(model.model_type === MODEL_TYPES.WEIGHTED_EXPONENTIAL ||
        model.model_type === MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE ||
        model.model_type === MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE) && (
        <Fragment>
          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="s">
            {
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('alpha')}
                  label={i18n.translate('visTypeTimeseries.movingAverage.alpha', {
                    defaultMessage: 'Alpha',
                  })}
                >
                  <EuiFieldNumber
                    step={0.1}
                    onChange={handleNumberChange('alpha')}
                    value={model.alpha}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            }
            {(model.model_type === MODEL_TYPES.WEIGHTED_EXPONENTIAL_DOUBLE ||
              model.model_type === MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE) && (
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('beta')}
                  label={i18n.translate('visTypeTimeseries.movingAverage.beta', {
                    defaultMessage: 'Beta',
                  })}
                >
                  <EuiFieldNumber
                    step={0.1}
                    onChange={handleNumberChange('beta')}
                    value={model.beta}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
            {model.model_type === MODEL_TYPES.WEIGHTED_EXPONENTIAL_TRIPLE && (
              <Fragment>
                <EuiFlexItem>
                  <EuiFormRow
                    id={htmlId('gamma')}
                    label={i18n.translate('visTypeTimeseries.movingAverage.gamma', {
                      defaultMessage: 'Gamma',
                    })}
                  >
                    <EuiFieldNumber
                      step={0.1}
                      onChange={handleNumberChange('gamma')}
                      value={model.gamma}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    id={htmlId('period')}
                    label={i18n.translate('visTypeTimeseries.movingAverage.period', {
                      defaultMessage: 'Period',
                    })}
                  >
                    <EuiFieldNumber
                      step={1}
                      onChange={handleNumberChange('period')}
                      value={model.period}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    id={htmlId('multiplicative')}
                    label={i18n.translate('visTypeTimeseries.movingAverage.multiplicative', {
                      defaultMessage: 'Multiplicative',
                    })}
                  >
                    <EuiComboBox
                      placeholder={i18n.translate(
                        'visTypeTimeseries.movingAverage.multiplicative.selectPlaceholder',
                        {
                          defaultMessage: 'Select',
                        }
                      )}
                      options={multiplicativeOptions}
                      selectedOptions={selectedMultiplicative ? [selectedMultiplicative] : []}
                      onChange={handleSelectChange('multiplicative')}
                      singleSelection={{ asPlainText: true }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </Fragment>
            )}
          </EuiFlexGroup>
        </Fragment>
      )}
    </AggRow>
  );
};

MovingAverageAgg.propTypes = {
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
};
