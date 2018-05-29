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
import FieldSelect from './aggs/field_select';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';
import YesNo from './yes_no';
import { htmlIdGenerator } from '@elastic/eui';

export const IndexPattern = props => {
  const { fields, prefix } = props;
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const timeFieldName = `${prefix}time_field`;
  const indexPatternName = `${prefix}index_pattern`;
  const intervalName = `${prefix}interval`;
  const dropBucketName = `${prefix}drop_last_bucket`;

  const defaults = {
    [indexPatternName]: '*',
    [intervalName]: 'auto',
    [dropBucketName]: 1
  };

  const htmlId = htmlIdGenerator();

  const model = { ...defaults, ...props.model };
  return (
    <div className={props.className}>
      <label className="vis_editor__label" htmlFor={htmlId('indexPattern')}>
        Index Pattern
      </label>
      <input
        id={htmlId('indexPattern')}
        className="vis_editor__input"
        disabled={props.disabled}
        onChange={handleTextChange(indexPatternName, '*')}
        value={model[indexPatternName]}
      />
      <label className="vis_editor__label" htmlFor={htmlId('timeField')}>
        Time Field
      </label>
      <div className="vis_editor__index_pattern-fields">
        <FieldSelect
          id={htmlId('timeField')}
          restrict="date"
          value={model[timeFieldName]}
          disabled={props.disabled}
          onChange={handleSelectChange(timeFieldName)}
          indexPattern={model[indexPatternName]}
          fields={fields}
        />
      </div>
      <label className="vis_editor__label" htmlFor={htmlId('interval')}>
        Interval (auto, 1m, 1d, 7d, 1y, &gt;=1m)
      </label>
      <input
        id={htmlId('interval')}
        className="vis_editor__input"
        disabled={props.disabled}
        onChange={handleTextChange(intervalName, 'auto')}
        value={model[intervalName]}
      />
      <div className="vis_editor__label">Drop Last Bucket</div>
      <YesNo
        value={model[dropBucketName]}
        name={dropBucketName}
        onChange={props.onChange}
      />
    </div>
  );
};

IndexPattern.defaultProps = {
  prefix: '',
  disabled: false,
  className: 'vis_editor__row'
};

IndexPattern.propTypes = {
  model: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string
};
