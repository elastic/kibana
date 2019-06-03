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
import { i18n } from '@kbn/i18n';
import { FieldSelect } from './aggs/field_select';
import { createSelectHandler } from './lib/create_select_handler';
import { createTextHandler } from './lib/create_text_handler';
import { TIME_RANGE_DATA_MODES, TIME_RANGE_MODE_KEY } from '../../common/timerange_data_modes';
import { YesNo } from './yes_no';
import {
  htmlIdGenerator,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiText,
} from '@elastic/eui';
import { ES_TYPES } from '../../common/es_types';

const RESTRICT_FIELDS = [ES_TYPES.DATE];

const htmlId = htmlIdGenerator();
const timeRangeOptions = [
  {
    label: i18n.translate('tsvb.indexPattern.timeRange.lastValue', {
      defaultMessage: 'Last value',
    }),
    value: TIME_RANGE_DATA_MODES.LAST_VALUE,
  },
  {
    label: i18n.translate('tsvb.indexPattern.timeRange.entireTimeRange', {
      defaultMessage: 'Entire time range',
    }),
    value: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
  },
];

const isEntireTimeRangeEnabled = (model, timerange) => timerange && model[TIME_RANGE_MODE_KEY] === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE;

export const IndexPattern = props => {
  const { fields, prefix, timerange } = props;
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const timeFieldName = `${prefix}time_field`;
  const indexPatternName = `${prefix}index_pattern`;
  const intervalName = `${prefix}interval`;
  const dropBucketName = `${prefix}drop_last_bucket`;

  const defaults = {
    default_index_pattern: '',
    [indexPatternName]: '*',
    [intervalName]: 'auto',
    [dropBucketName]: 1,
    [TIME_RANGE_MODE_KEY]: timeRangeOptions[0].value,
  };

  const model = { ...defaults, ...props.model };
  const isDefaultIndexPatternUsed = model.default_index_pattern && !model[indexPatternName];
  const selectedTimeRangeOption = timeRangeOptions.find(({ value }) => model[TIME_RANGE_MODE_KEY] === value);

  return (
    <div className="index-pattern">
      {timerange && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('timeRange')}
              label={i18n.translate('tsvb.indexPattern.timeRange.label', {
                defaultMessage: 'Data timerange mode',
              })}
            >
              <EuiComboBox
                isClearable={false}
                placeholder={i18n.translate('tsvb.indexPattern.timeRange.selectTimeRange', {
                  defaultMessage: 'Select',
                })}
                options={timeRangeOptions}
                selectedOptions={selectedTimeRangeOption ? [selectedTimeRangeOption] : []}
                onChange={handleSelectChange(TIME_RANGE_MODE_KEY)}
                singleSelection={{ asPlainText: true }}
                isDisabled={props.disabled}
              />
            </EuiFormRow>
            <EuiText size="xs" style={{ margin: 0 }}>
              This setting controls the timespan used for matching documents.&nbsp;
              &quot;Entire timerange&quot; will match all the documents selected in the timepicker.&nbsp;
              &quot;Last value&quot; will match only the documents for the specified interval from the end of the timerange.
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('indexPattern')}
            label={i18n.translate('tsvb.indexPatternLabel', { defaultMessage: 'Index pattern' })}
            helpText={
              isDefaultIndexPatternUsed &&
              i18n.translate('tsvb.indexPattern.searchByDefaultIndex', {
                defaultMessage: 'Default index pattern is used. To query all indexes use *',
              })
            }
          >
            <EuiFieldText
              data-test-subj="metricsIndexPatternInput"
              disabled={props.disabled}
              placeholder={model.default_index_pattern}
              onChange={handleTextChange(indexPatternName, '*')}
              value={model[indexPatternName]}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('timeField')}
            label={i18n.translate('tsvb.indexPattern.timeFieldLabel', {
              defaultMessage: 'Time field',
            })}
          >
            <FieldSelect
              data-test-subj="metricsIndexPatternFieldsSelect"
              restrict={RESTRICT_FIELDS}
              value={model[timeFieldName]}
              disabled={props.disabled}
              onChange={handleSelectChange(timeFieldName)}
              indexPattern={model[indexPatternName]}
              fields={fields}
              placeholder={isDefaultIndexPatternUsed ? model.default_timefield : undefined}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('interval')}
            label={i18n.translate('tsvb.indexPattern.intervalLabel', {
              defaultMessage: 'Interval',
            })}
            helpText={i18n.translate('tsvb.indexPattern.intervalHelpText', {
              defaultMessage: 'Examples: auto, 1m, 1d, 7d, 1y, >=1m',
              description: 'auto, 1m, 1d, 7d, 1y, >=1m are required values and must not be translated.',
            })}
          >
            <EuiFieldText
              disabled={props.disabled || isEntireTimeRangeEnabled(model, timerange)}
              onChange={handleTextChange(intervalName, 'auto')}
              value={model[intervalName]}
              placeholder={'auto'}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('dropLastBucket')}
            label={i18n.translate('tsvb.indexPattern.dropLastBucketLabel', {
              defaultMessage: 'Drop last bucket?',
            })}
          >
            <YesNo
              value={model[dropBucketName]}
              name={dropBucketName}
              onChange={props.onChange}
              disabled={isEntireTimeRangeEnabled(model, timerange) || props.disabled}
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
  timerange: true,
};

IndexPattern.propTypes = {
  model: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  timerange: PropTypes.bool,
};
