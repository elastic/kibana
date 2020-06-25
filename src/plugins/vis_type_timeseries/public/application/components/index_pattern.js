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

import { get } from 'lodash';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import {
  htmlIdGenerator,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiText,
} from '@elastic/eui';
import { FieldSelect } from './aggs/field_select';
import { createSelectHandler } from './lib/create_select_handler';
import { createTextHandler } from './lib/create_text_handler';
import { YesNo } from './yes_no';
import { KBN_FIELD_TYPES } from '../../../../../plugins/data/public';
import { FormValidationContext } from '../contexts/form_validation_context';
import {
  isGteInterval,
  validateReInterval,
  isAutoInterval,
  AUTO_INTERVAL,
} from './lib/get_interval';
import { i18n } from '@kbn/i18n';
import {
  TIME_RANGE_DATA_MODES,
  TIME_RANGE_MODE_KEY,
} from '../../../../../plugins/vis_type_timeseries/common/timerange_data_modes';
import { PANEL_TYPES } from '../../../../../plugins/vis_type_timeseries/common/panel_types';
import { isTimerangeModeEnabled } from '../lib/check_ui_restrictions';
import { VisDataContext } from '../contexts/vis_data_context';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];

const validateIntervalValue = (intervalValue) => {
  const isAutoOrGteInterval = isGteInterval(intervalValue) || isAutoInterval(intervalValue);

  if (isAutoOrGteInterval) {
    return {
      isValid: true,
    };
  }
  return validateReInterval(intervalValue);
};

const htmlId = htmlIdGenerator();

const isEntireTimeRangeActive = (model, isTimeSeries) =>
  !isTimeSeries && model[TIME_RANGE_MODE_KEY] === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE;

export const IndexPattern = ({ fields, prefix, onChange, disabled, model: _model }) => {
  const handleSelectChange = createSelectHandler(onChange);
  const handleTextChange = createTextHandler(onChange);
  const timeFieldName = `${prefix}time_field`;
  const indexPatternName = `${prefix}index_pattern`;
  const intervalName = `${prefix}interval`;
  const dropBucketName = `${prefix}drop_last_bucket`;
  const updateControlValidity = useContext(FormValidationContext);
  const uiRestrictions = get(useContext(VisDataContext), 'uiRestrictions');

  const timeRangeOptions = [
    {
      label: i18n.translate('visTypeTimeseries.indexPattern.timeRange.lastValue', {
        defaultMessage: 'Last value',
      }),
      value: TIME_RANGE_DATA_MODES.LAST_VALUE,
      disabled: !isTimerangeModeEnabled(TIME_RANGE_DATA_MODES.LAST_VALUE, uiRestrictions),
    },
    {
      label: i18n.translate('visTypeTimeseries.indexPattern.timeRange.entireTimeRange', {
        defaultMessage: 'Entire time range',
      }),
      value: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      disabled: !isTimerangeModeEnabled(TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE, uiRestrictions),
    },
  ];

  const defaults = {
    default_index_pattern: '',
    [indexPatternName]: '*',
    [intervalName]: AUTO_INTERVAL,
    [dropBucketName]: 1,
    [TIME_RANGE_MODE_KEY]: timeRangeOptions[0].value,
  };

  const model = { ...defaults, ..._model };
  const isDefaultIndexPatternUsed = model.default_index_pattern && !model[indexPatternName];
  const intervalValidation = validateIntervalValue(model[intervalName]);
  const selectedTimeRangeOption = timeRangeOptions.find(
    ({ value }) => model[TIME_RANGE_MODE_KEY] === value
  );
  const isTimeSeries = model.type === PANEL_TYPES.TIMESERIES;

  updateControlValidity(intervalName, intervalValidation.isValid);

  return (
    <div className="index-pattern">
      {!isTimeSeries && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('timeRange')}
              label={i18n.translate('visTypeTimeseries.indexPattern.timeRange.label', {
                defaultMessage: 'Data timerange mode',
              })}
            >
              <EuiComboBox
                isClearable={false}
                placeholder={i18n.translate(
                  'visTypeTimeseries.indexPattern.timeRange.selectTimeRange',
                  {
                    defaultMessage: 'Select',
                  }
                )}
                options={timeRangeOptions}
                selectedOptions={selectedTimeRangeOption ? [selectedTimeRangeOption] : []}
                onChange={handleSelectChange(TIME_RANGE_MODE_KEY)}
                singleSelection={{ asPlainText: true }}
                isDisabled={disabled}
              />
            </EuiFormRow>
            <EuiText size="xs" style={{ margin: 0 }}>
              {i18n.translate('visTypeTimeseries.indexPattern.timeRange.hint', {
                defaultMessage: `This setting controls the timespan used for matching documents.
                "Entire timerange" will match all the documents selected in the timepicker.
                "Last value" will match only the documents for the specified interval from the end of the timerange.`,
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('indexPattern')}
            label={i18n.translate('visTypeTimeseries.indexPatternLabel', {
              defaultMessage: 'Index pattern',
            })}
            helpText={
              isDefaultIndexPatternUsed &&
              i18n.translate('visTypeTimeseries.indexPattern.searchByDefaultIndex', {
                defaultMessage: 'Default index pattern is used. To query all indexes use *',
              })
            }
          >
            <EuiFieldText
              data-test-subj="metricsIndexPatternInput"
              disabled={disabled}
              placeholder={model.default_index_pattern}
              onChange={handleTextChange(indexPatternName, '*')}
              value={model[indexPatternName]}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('timeField')}
            label={i18n.translate('visTypeTimeseries.indexPattern.timeFieldLabel', {
              defaultMessage: 'Time field',
            })}
          >
            <FieldSelect
              data-test-subj="metricsIndexPatternFieldsSelect"
              restrict={RESTRICT_FIELDS}
              value={model[timeFieldName]}
              disabled={disabled}
              onChange={handleSelectChange(timeFieldName)}
              indexPattern={model[indexPatternName]}
              fields={fields}
              placeholder={isDefaultIndexPatternUsed ? model.default_timefield : undefined}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            isInvalid={!intervalValidation.isValid}
            error={intervalValidation.errorMessage}
            id={htmlId('interval')}
            label={i18n.translate('visTypeTimeseries.indexPattern.intervalLabel', {
              defaultMessage: 'Interval',
            })}
            helpText={i18n.translate('visTypeTimeseries.indexPattern.intervalHelpText', {
              defaultMessage: 'Examples: auto, 1m, 1d, 7d, 1y, >=1m',
              description:
                'auto, 1m, 1d, 7d, 1y, >=1m are required values and must not be translated.',
            })}
          >
            <EuiFieldText
              data-test-subj="metricsIndexPatternInterval"
              isInvalid={!intervalValidation.isValid}
              disabled={disabled || isEntireTimeRangeActive(model, isTimeSeries)}
              onChange={handleTextChange(intervalName, AUTO_INTERVAL)}
              value={model[intervalName]}
              placeholder={AUTO_INTERVAL}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('dropLastBucket')}
            label={i18n.translate('visTypeTimeseries.indexPattern.dropLastBucketLabel', {
              defaultMessage: 'Drop last bucket?',
            })}
          >
            <YesNo
              data-test-subj="metricsDropLastBucket"
              value={model[dropBucketName]}
              name={dropBucketName}
              onChange={onChange}
              disabled={disabled || isEntireTimeRangeActive(model, isTimeSeries)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

IndexPattern.defaultProps = {
  prefix: '',
  disabled: false,
};

IndexPattern.propTypes = {
  model: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
