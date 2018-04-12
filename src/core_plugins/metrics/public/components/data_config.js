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

import React from 'react';
import createTextHandler from './lib/create_text_handler';
import createSelectHandler from './lib/create_select_handler';
import { Code } from './code';
import { Note } from './note';
import { Info } from './info';
import { htmlIdGenerator, EuiComboBox } from '@elastic/eui';
import FieldSelect from './aggs/field_select';

export function DataConfig({ onChange, model, fields }) {
  const handleSelectChange = createSelectHandler(onChange);
  const handleTextChange = createTextHandler(onChange);
  const htmlId = htmlIdGenerator();
  const timerangeModes = [
    { label: 'Entire timerange', value: 'all' },
    { label: 'Last value', value: 'last' }
  ];
  const timerangeModeHelp = (
    <Note style={{ width: '300px' }}>
      This setting controls the timespan used for matching documents.{' '}
      <Code>Entire timerange</Code> will match all the documents selected
      in the timepicker. <Code>Last value</Code> will match only the documents
      for the specified interval from the end of the timerange.
    </Note>
  );

  const selectedOption = timerangeModes.find(option => {
    return option.value === model.timerange_mode;
  });
  const selectedOptions = selectedOption ? [selectedOption] : [];

  return (

    <div className="vis_editor__container">
      <div className="vis_editor__vis_config-row">
        <label className="vis_editor__label" htmlFor={htmlId('index_pattern')}>
          Index pattern
        </label>
        <input
          id={htmlId('index_pattern')}
          className="vis_editor__input-grows"
          type="text"
          onChange={handleTextChange('index_pattern')}
          value={model.index_pattern}
        />
        <label className="vis_editor__label" htmlFor={htmlId('time_field')}>
          Time Field
        </label>
        <div className="vis_editor__row_item">
          <FieldSelect
            id={htmlId('time_field')}
            restrict="date"
            value={model.time_field}
            onChange={handleSelectChange('time_field')}
            indexPattern={model.index_pattern}
            fields={fields}
          />
        </div>
        {model.type === 'timeseries' ? (
          <label className="vis_editor__label" htmlFor={htmlId('interval')}>
            Interval (auto, 1m, 1d, 7d, 1y, &gt;=1m)
          </label>
        ) : null}
        {model.type === 'timeseries' ? (
          <input
            id={htmlId('interval')}
            className="vis_editor__input"
            onChange={handleTextChange('interval', 'auto')}
            value={model.interval}
          />
        ) : null}
        {model.type !== 'timeseries' ? (
          <label className="vis_editor__label" htmlFor={htmlId('timerange_mode')}>
            Timerange mode <Info message={timerangeModeHelp} />
          </label>
        ) : null}
        {model.type !== 'timeseries' ? (
          <div className="vis_editor__row_item" data-test-subj="dataTimeRange">
            <EuiComboBox
              options={timerangeModes}
              isClearable={false}
              onChange={handleSelectChange('timerange_mode')}
              selectedOptions={selectedOptions}
              singleSelection={true}
            />
          </div>
        ) : null}
        {model.type !== 'timeseries' && model.timerange_mode === 'last' && (
          <label className="vis_editor__label" htmlFor={htmlId('timerange_mode_interval')}>
            Interval (1s, 1m, 1h, 1d, &gt;=1m)
          </label>
        ) || null}
        {model.type !== 'timeseries' && model.timerange_mode === 'last' && (
          <input
            id={htmlId('timerange_mode_interval')}
            data-test-subj="timeRangeInterval"
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('timerange_mode_interval')}
            value={model.timerange_mode_interval}
          />
        ) || null}
      </div>
    </div>
  );

}
