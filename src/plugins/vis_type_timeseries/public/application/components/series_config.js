/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { DataFormatPicker } from './data_format_picker';
import { createSelectHandler } from './lib/create_select_handler';
import { createTextHandler } from './lib/create_text_handler';
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
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SeriesConfigQueryBarWithIgnoreGlobalFilter } from './series_config_query_bar_with_ignore_global_filter';

export const SeriesConfig = (props) => {
  const defaults = { offset_time: '', value_template: '' };
  const model = { ...defaults, ...props.model };
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const htmlId = htmlIdGenerator();
  const seriesIndexPattern =
    props.model.override_index_pattern && props.model.series_index_pattern
      ? props.model.series_index_pattern
      : props.indexPatternForQuery;

  return (
    <div className="tvbAggRow">
      <DataFormatPicker onChange={handleSelectChange('formatter')} value={model.formatter} />

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
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
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
          <EuiFormLabel>
            <FormattedMessage
              id="visTypeTimeseries.seriesConfig.overrideIndexPatternLabel"
              defaultMessage="Override Index Pattern?"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo
            value={model.override_index_pattern}
            name="override_index_pattern"
            onChange={props.onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IndexPattern
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
  indexPatternForQuery: PropTypes.string,
};
