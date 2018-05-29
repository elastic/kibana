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
import DataFormatPicker from './data_format_picker';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';
import YesNo from './yes_no';
import { IndexPattern } from './index_pattern';
import { htmlIdGenerator } from '@elastic/eui';

export const SeriesConfig = props => {
  const defaults = { offset_time: '', value_template: '' };
  const model = { ...defaults, ...props.model };
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const htmlId = htmlIdGenerator();

  return (
    <div>
      <div className="vis_editor__series_config-container">
        <div className="vis_editor__series_config-row">
          <DataFormatPicker
            onChange={handleSelectChange('formatter')}
            value={model.formatter}
          />
          <label className="vis_editor__label" htmlFor={htmlId('template')}>
            Template (eg.<code>{'{{value}}/s'}</code>)
          </label>
          <input
            style={{ width: 100 }}
            id={htmlId('template')}
            className="vis_editor__input-grows"
            onChange={handleTextChange('value_template')}
            value={model.value_template}
          />
          <label className="vis_editor__label" htmlFor={htmlId('offsetSeries')}>
            Offset series time by (1m, 1h, 1w, 1d)
          </label>
          <input
            data-test-subj="offsetTimeSeries"
            style={{ width: 100 }}
            id={htmlId('offsetSeries')}
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('offset_time')}
            value={model.offset_time}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <div className="vis_editor__label">Override Index Pattern</div>
          <YesNo
            value={model.override_index_pattern}
            name="override_index_pattern"
            onChange={props.onChange}
          />
          <IndexPattern
            onChange={props.onChange}
            model={props.model}
            fields={props.fields}
            prefix="series_"
            className="vis_editor__row_item vis_editor__row"
            disabled={!model.override_index_pattern}
          />
        </div>
        <div className="vis_editor__series_config-row">
          <label className="vis_editor__label" htmlFor={htmlId('series_filter')}>
            Filter
          </label>
          <input
            id={htmlId('series_filter')}
            className="vis_editor__input-grows"
            type="text"
            onChange={handleTextChange('filter')}
            value={model.filter}
          />
        </div>
      </div>
    </div>
  );
};

SeriesConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func
};
