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
import { data } from 'plugins/data/setup';
import { Storage } from 'ui/storage';
import { getDefaultQueryLanguage } from './lib/get_default_query_language';
const { QueryBarInput } = data.query.ui;
const localStorage = new Storage(window.localStorage);

export const SeriesConfig = props => {
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

      <EuiFormRow
        id={htmlId('series_filter')}
        label={<FormattedMessage id="tsvb.seriesConfig.filterLabel" defaultMessage="Filter" />}
        fullWidth
      >
        <QueryBarInput
          query={{
            language:
              model.filter && model.filter.language
                ? model.filter.language
                : getDefaultQueryLanguage(),
            query: model.filter && model.filter.query ? model.filter.query : '',
          }}
          onChange={filter => props.onChange({ filter })}
          appName={'VisEditor'}
          indexPatterns={[seriesIndexPattern]}
          store={localStorage}
          showDatePicker={false}
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('template')}
            label={
              <FormattedMessage id="tsvb.seriesConfig.templateLabel" defaultMessage="Template" />
            }
            helpText={
              <span>
                <FormattedMessage
                  id="tsvb.seriesConfig.templateHelpText"
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
                id="tsvb.seriesConfig.offsetSeriesTimeLabel"
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
              id="tsvb.seriesConfig.overrideIndexPatternLabel"
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
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPatternForQuery: PropTypes.string,
};
