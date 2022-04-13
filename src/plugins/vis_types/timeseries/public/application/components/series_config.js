/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { last } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import PropTypes from 'prop-types';
import React, { useMemo, useCallback } from 'react';
import { DataFormatPicker } from './data_format_picker';
import { createTextHandler } from './lib/create_text_handler';
import { checkIfNumericMetric } from './lib/check_if_numeric_metric';
import { YesNo } from './yes_no';
import { IndexPattern } from './index_pattern';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiCode,
  EuiHorizontalRule,
} from '@elastic/eui';
import { SeriesConfigQueryBarWithIgnoreGlobalFilter } from './series_config_query_bar_with_ignore_global_filter';
import { DATA_FORMATTERS } from '../../../common/enums';

export const SeriesConfig = (props) => {
  const defaults = { offset_time: '', value_template: '{{value}}' };
  const model = { ...defaults, ...props.model };
  const handleTextChange = createTextHandler(props.onChange);
  const htmlId = htmlIdGenerator();
  const seriesIndexPattern = props.model.override_index_pattern
    ? props.model.series_index_pattern
    : props.indexPatternForQuery;

  const changeModelFormatter = useCallback((formatter) => props.onChange({ formatter }), [props]);
  const isNumericMetric = useMemo(
    () => checkIfNumericMetric(last(model.metrics), props.fields, seriesIndexPattern),
    [model.metrics, props.fields, seriesIndexPattern]
  );
  const isKibanaIndexPattern = props.panel.use_kibana_indexes || seriesIndexPattern === '';

  const { indexPatternForQuery, onChange } = props;
  const onChangeOverride = useCallback(
    (partialState) => {
      const stateUpdate = { ...partialState };
      const isEnabling = partialState.override_index_pattern;
      if (isEnabling && !model.series_index_pattern) {
        stateUpdate.series_index_pattern = indexPatternForQuery;
      }
      onChange(stateUpdate);
    },
    [model.series_index_pattern, indexPatternForQuery, onChange]
  );

  return (
    <div className="tvbAggRow">
      <EuiFlexGroup gutterSize="s">
        <DataFormatPicker
          formatterValue={model.formatter}
          changeModelFormatter={changeModelFormatter}
          shouldIncludeDefaultOption={isKibanaIndexPattern}
          shouldIncludeNumberOptions={isNumericMetric}
        />
        <EuiFlexItem grow={3}>
          <EuiFormRow
            id={htmlId('template')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.seriesConfig.templateLabel"
                defaultMessage="Template"
              />
            }
            helpText={
              <span>
                <FormattedMessage
                  id="visTypeTimeseries.seriesConfig.templateHelpText"
                  defaultMessage="eg. {templateExample}"
                  values={{ templateExample: <EuiCode>{'{{value}}/s'}</EuiCode> }}
                />
              </span>
            }
            fullWidth
          >
            <EuiFieldText
              onChange={handleTextChange('value_template')}
              value={model.value_template}
              disabled={model.formatter === DATA_FORMATTERS.DEFAULT}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <SeriesConfigQueryBarWithIgnoreGlobalFilter
        model={model}
        onChange={props.onChange}
        panel={props.panel}
        indexPatternForQuery={seriesIndexPattern}
      />

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('offsetSeries')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.seriesConfig.offsetSeriesTimeLabel"
                defaultMessage="Offset series time by (1m, 1h, 1w, 1d)"
                description="1m, 1h, 1w and 1d are required values and must not be translated."
              />
            }
          >
            <EuiFieldText
              data-test-subj="offsetTimeSeries"
              onChange={handleTextChange('offset_time')}
              value={model.offset_time}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('visTypeTimeseries.seriesConfig.overrideDataViewLabel', {
              defaultMessage: 'Override data view?',
            })}
          >
            <YesNo
              value={model.override_index_pattern}
              name="override_index_pattern"
              onChange={onChangeOverride}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <IndexPattern
            baseIndexPattern={indexPatternForQuery}
            onChange={props.onChange}
            model={props.model}
            fields={props.fields}
            prefix="series_"
            disabled={!model.override_index_pattern}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

SeriesConfig.propTypes = {
  fields: PropTypes.object,
  panel: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPatternForQuery: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};
