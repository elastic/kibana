/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import PropTypes from 'prop-types';
import React, { useContext, useCallback, useEffect, useState } from 'react';
import {
  htmlIdGenerator,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiRange,
  EuiIconTip,
  EuiFormLabel,
} from '@elastic/eui';
import { FieldSelect } from './aggs/field_select';
import { createSelectHandler } from './lib/create_select_handler';
import { createTextHandler } from './lib/create_text_handler';
import { IndexPatternSelect } from './lib/index_pattern_select';
import { YesNo } from './yes_no';
import { LastValueModePopover } from './last_value_mode_popover';
import { KBN_FIELD_TYPES } from '../../../../../data/public';
import { isGteInterval, validateReInterval, isAutoInterval } from './lib/get_interval';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PANEL_TYPES, TIME_RANGE_DATA_MODES, TIME_RANGE_MODE_KEY } from '../../../common/enums';
import { AUTO_INTERVAL } from '../../../common/constants';
import { isTimerangeModeEnabled } from '../../../common/check_ui_restrictions';
import { VisDataContext } from '../contexts/vis_data_context';
import { PanelModelContext } from '../contexts/panel_model_context';
import { FormValidationContext } from '../contexts/form_validation_context';
import { getUISettings, getDataViewsStart } from '../../services';
import { UI_SETTINGS } from '../../../../../data/common';
import { fetchIndexPattern } from '../../../common/index_patterns_utils';

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];
const LEVEL_OF_DETAIL_STEPS = 10;
const LEVEL_OF_DETAIL_MIN_BUCKETS = 1;
const HIDE_LAST_VALUE_INDICATOR = 'hide_last_value_indicator';

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

export const IndexPattern = ({
  fields,
  prefix,
  onChange,
  disabled,
  model: _model,
  allowLevelOfDetail,
  allowIndexSwitchingMode,
  baseIndexPattern,
}) => {
  const config = getUISettings();
  const timeFieldName = `${prefix}time_field`;
  const indexPatternName = `${prefix}index_pattern`;
  const intervalName = `${prefix}interval`;
  const maxBarsName = `${prefix}max_bars`;
  const dropBucketName = `${prefix}drop_last_bucket`;
  const updateControlValidity = useContext(FormValidationContext);
  const panelModel = useContext(PanelModelContext);
  const uiRestrictions = get(useContext(VisDataContext), 'uiRestrictions');

  const maxBarsUiSettings = config.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);

  const [fetchedIndex, setFetchedIndex] = useState(null);

  const isTimeSeries = panelModel.type === PANEL_TYPES.TIMESERIES;

  const handleMaxBarsChange = useCallback(
    ({ target }) => {
      onChange({
        [maxBarsName]: Math.max(LEVEL_OF_DETAIL_MIN_BUCKETS, target.value),
      });
    },
    [onChange, maxBarsName]
  );

  const handleSelectChange = createSelectHandler(onChange);
  const handleTextChange = createTextHandler(onChange);

  const timeRangeOptions = [
    {
      label: i18n.translate('visTypeTimeseries.indexPattern.timeRange.entireTimeRange', {
        defaultMessage: 'Entire time range',
      }),
      value: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
      disabled: !isTimerangeModeEnabled(TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE, uiRestrictions),
    },
    {
      label: i18n.translate('visTypeTimeseries.indexPattern.timeRange.lastValue', {
        defaultMessage: 'Last value',
      }),
      value: TIME_RANGE_DATA_MODES.LAST_VALUE,
      disabled: !isTimerangeModeEnabled(TIME_RANGE_DATA_MODES.LAST_VALUE, uiRestrictions),
    },
  ];

  const defaults = {
    [indexPatternName]: '',
    [intervalName]: AUTO_INTERVAL,
    [dropBucketName]: 0,
    [maxBarsName]: config.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
    [TIME_RANGE_MODE_KEY]: timeRangeOptions[0].value,
  };

  const model = { ...defaults, ..._model };
  const index = model[indexPatternName];

  const intervalValidation = validateIntervalValue(model[intervalName]);
  const selectedTimeRangeOption = timeRangeOptions.find(
    ({ value }) => model[TIME_RANGE_MODE_KEY] === value
  );

  const isDataTimerangeModeInvalid =
    !disabled &&
    selectedTimeRangeOption &&
    !isTimerangeModeEnabled(selectedTimeRangeOption.value, uiRestrictions);

  useEffect(() => {
    updateControlValidity(intervalName, intervalValidation.isValid);
  }, [intervalName, intervalValidation.isValid, updateControlValidity]);

  useEffect(() => {
    async function fetchIndex() {
      const dataViews = getDataViewsStart();
      let fetchedIndexPattern = {
        indexPattern: undefined,
        indexPatternString: undefined,
      };

      const indexPatternToFetch = index || baseIndexPattern;

      try {
        fetchedIndexPattern = indexPatternToFetch
          ? await fetchIndexPattern(indexPatternToFetch, dataViews, {
              fetchKibanaIndexForStringIndexes: true,
            })
          : {
              ...fetchedIndexPattern,
              defaultIndex: await dataViews.getDefault(),
            };
      } catch {
        // nothing to be here
      }

      setFetchedIndex(fetchedIndexPattern);
    }

    fetchIndex();
  }, [index, baseIndexPattern]);

  const toggleIndicatorDisplay = useCallback(
    () => onChange({ [HIDE_LAST_VALUE_INDICATOR]: !model.hide_last_value_indicator }),
    [model.hide_last_value_indicator, onChange]
  );

  return (
    <div className="index-pattern">
      {!isTimeSeries && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('timeRange')}
              label={
                <>
                  <FormattedMessage
                    id="visTypeTimeseries.indexPattern.timeRange.label"
                    defaultMessage="Data timerange mode"
                  />{' '}
                  <EuiIconTip
                    position="right"
                    content={
                      <FormattedMessage
                        id="visTypeTimeseries.indexPattern.timeRange.hint"
                        defaultMessage='This setting controls the timespan used for matching documents.
                        "Entire timerange" will match all the documents selected in the timepicker.
                        "Last value" will match only the documents for the specified interval from the end of the timerange.'
                      />
                    }
                    type="questionInCircle"
                  />
                </>
              }
              isInvalid={isDataTimerangeModeInvalid}
              error={i18n.translate('visTypeTimeseries.indexPattern.timeRange.error', {
                defaultMessage: 'You cannot use "{mode}" with the current index type.',
                values: {
                  mode: selectedTimeRangeOption?.label,
                },
              })}
            >
              <EuiComboBox
                data-test-subj="dataTimeRangeMode"
                isClearable={false}
                isInvalid={isDataTimerangeModeInvalid}
                placeholder={i18n.translate(
                  'visTypeTimeseries.indexPattern.timeRange.selectTimeRange',
                  {
                    defaultMessage: 'Select',
                  }
                )}
                options={timeRangeOptions}
                error={i18n.translate('visTypeTimeseries.indexPattern.timeRange.entireTimeRange', {
                  defaultMessage: 'Entire time range',
                })}
                selectedOptions={selectedTimeRangeOption ? [selectedTimeRangeOption] : []}
                onChange={handleSelectChange(TIME_RANGE_MODE_KEY)}
                singleSelection={{ asPlainText: true }}
                isDisabled={disabled}
                {...(!isEntireTimeRangeActive(model, isTimeSeries) && {
                  append: (
                    <LastValueModePopover
                      isIndicatorDisplayed={!model.hide_last_value_indicator}
                      toggleIndicatorDisplay={toggleIndicatorDisplay}
                    />
                  ),
                })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
          <IndexPatternSelect
            fetchedIndex={fetchedIndex}
            indexPatternName={indexPatternName}
            onChange={onChange}
            disabled={disabled}
            allowIndexSwitchingMode={allowIndexSwitchingMode}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldSelect
            label={i18n.translate('visTypeTimeseries.indexPattern.timeFieldLabel', {
              defaultMessage: 'Time field',
            })}
            restrict={RESTRICT_FIELDS}
            value={model[timeFieldName]}
            disabled={disabled}
            onChange={(value) =>
              onChange({
                [timeFieldName]: value?.[0],
              })
            }
            indexPattern={model[indexPatternName]}
            fields={fields}
            placeholder={
              fetchedIndex?.indexPattern?.timeFieldName ?? fetchedIndex?.defaultIndex?.timeFieldName
            }
          />
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
      {allowLevelOfDetail && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              id={htmlId('detailLevel')}
              label={
                <>
                  <FormattedMessage
                    id="visTypeTimeseries.indexPattern.detailLevel"
                    defaultMessage="Level of detail"
                  />{' '}
                  <EuiIconTip
                    position="right"
                    content={
                      <FormattedMessage
                        id="visTypeTimeseries.indexPattern.detailLevelHelpText"
                        defaultMessage="Controls the auto and gte intervals based on the time range. The default interval is affected by the advanced settings {histogramTargetBars} and {histogramMaxBars}."
                        values={{
                          histogramTargetBars: UI_SETTINGS.HISTOGRAM_MAX_BARS,
                          histogramMaxBars: UI_SETTINGS.HISTOGRAM_BAR_TARGET,
                        }}
                      />
                    }
                    type="questionInCircle"
                  />
                </>
              }
            >
              <EuiFlexGroup responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiFormLabel>
                    <FormattedMessage
                      id="visTypeTimeseries.indexPattern.сoarse"
                      defaultMessage="Coarse"
                    />
                  </EuiFormLabel>
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <EuiRange
                    id={htmlIdGenerator()()}
                    value={model[maxBarsName]}
                    onChange={handleMaxBarsChange}
                    disabled={
                      disabled ||
                      isEntireTimeRangeActive(model, isTimeSeries) ||
                      !(isAutoInterval(model[intervalName]) || isGteInterval(model[intervalName]))
                    }
                    min={0}
                    max={maxBarsUiSettings}
                    step={maxBarsUiSettings / LEVEL_OF_DETAIL_STEPS}
                    aria-label={i18n.translate(
                      'visTypeTimeseries.indexPattern.detailLevelAriaLabel',
                      {
                        defaultMessage: 'Level of detail',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormLabel>
                    <FormattedMessage
                      id="visTypeTimeseries.indexPattern.finest"
                      defaultMessage="Finest"
                    />
                  </EuiFormLabel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};

IndexPattern.defaultProps = {
  prefix: '',
  disabled: false,
};

IndexPattern.propTypes = {
  baseIndexPattern: PropTypes.oneOf([PropTypes.object, PropTypes.string]),
  model: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  allowLevelOfDetail: PropTypes.bool,
  allowIndexSwitchingMode: PropTypes.bool,
};
