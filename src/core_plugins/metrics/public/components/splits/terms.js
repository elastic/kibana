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
import GroupBySelect from './group_by_select';
import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import FieldSelect from '../aggs/field_select';
import MetricSelect from '../aggs/metric_select';
import {
  EuiComboBox,
} from '@elastic/eui';

export const SplitByTerms = props => {
  const handleTextChange = createTextHandler(props.onChange);
  const handleSelectChange = createSelectHandler(props.onChange);
  const { indexPattern } = props;
  const defaults = { terms_direction: 'desc', terms_size: 10, terms_order_by: '_count' };
  const model = { ...defaults, ...props.model };
  const { metrics } = model;
  const defaultCount = { value: '_count', label: 'Doc Count (default)' };
  const terms = { value: '_term', label: 'Terms' };

  const dirOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];
  const selectedDirectionOption = dirOptions.find(option => {
    return model.terms_direction === option.value;
  });

  return (
    <div className="vis_editor__split-container">
      <div className="vis_editor__label">Group By</div>
      <div className="vis_editor__split-selects">
        <GroupBySelect
          value={model.split_mode}
          onChange={handleSelectChange('split_mode')}
        />
      </div>
      <div className="vis_editor__label">By</div>
      <div className="vis_editor__item">
        <FieldSelect
          indexPattern={indexPattern}
          onChange={handleSelectChange('terms_field')}
          value={model.terms_field}
          fields={props.fields}
        />
      </div>
      <div className="vis_editor__label">Top</div>
      <input
        placeholder="Size..."
        type="number"
        value={model.terms_size}
        className="vis_editor__split-term_count"
        onChange={handleTextChange('terms_size')}
      />
      <div className="vis_editor__label">Order By</div>
      <div className="vis_editor__split-aggs">
        <MetricSelect
          metrics={metrics}
          clearable={false}
          additionalOptions={[defaultCount, terms]}
          onChange={handleSelectChange('terms_order_by')}
          restrict="basic"
          value={model.terms_order_by}
        />
      </div>
      <div className="vis_editor__label">Direction</div>
      <div className="vis_editor__split-aggs">
        <EuiComboBox
          isClearable={false}
          options={dirOptions}
          selectedOptions={selectedDirectionOption ? [selectedDirectionOption] : []}
          onChange={handleSelectChange('terms_direction')}
          singleSelection={true}
        />
      </div>
    </div>
  );
};

SplitByTerms.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPattern: PropTypes.string,
  fields: PropTypes.object
};
